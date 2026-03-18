import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"
import { notifySlack, slackMessages } from "@/lib/slack"
import { sendEmail, changesRequestedEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const notes = body.notes
  if (!notes?.trim()) return NextResponse.json({ error: "notes is required when requesting changes" }, { status: 400 })

  const stageAnswers = body.stage_answers ?? {}
  const now          = new Date().toISOString()

  const { data: review } = await supabaseServer
    .from("reviews")
    .select("id, tool_id, status, current_stage_id, tool:tools!tool_id(id, title, classification, creator_id)")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (!review) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (review.status !== "pending") {
    return NextResponse.json({ error: "Review is no longer pending" }, { status: 409 })
  }

  // Creators cannot review their own tools
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((review.tool as any)?.creator_id === auth.user.id) {
    return NextResponse.json({ error: "You cannot review your own tool" }, { status: 403 })
  }

  // Stage role verification
  if (review.current_stage_id && auth.user.role !== "admin") {
    const { data: stageRole } = await supabaseServer
      .from("review_stages")
      .select("assigned_role")
      .eq("id", review.current_stage_id)
      .single()
    if (stageRole?.assigned_role) {
      if (stageRole.assigned_role === "manager") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const creatorId = (review.tool as any)?.creator_id as string | undefined
        const managerId = creatorId
          ? await supabaseServer.from("users").select("manager_id").eq("id", creatorId).single()
              .then(({ data }) => data?.manager_id ?? null)
          : null
        if (!managerId || managerId !== auth.user.id) {
          return NextResponse.json({ error: "This stage requires the tool creator's manager" }, { status: 403 })
        }
      } else if (auth.user.role !== stageRole.assigned_role) {
        return NextResponse.json({ error: `This stage requires role: ${stageRole.assigned_role}` }, { status: 403 })
      }
    }
  } else if (!review.current_stage_id && !["reviewer", "admin"].includes(auth.user.role)) {
    return NextResponse.json({ error: "Requires reviewer or admin role" }, { status: 403 })
  }

  // Record stage action if pipeline-aware
  if (review.current_stage_id) {
    await supabaseServer.from("review_actions").insert({
      review_id:     params.id,
      stage_id:      review.current_stage_id,
      actor_id:      auth.user.id,
      action:        "changes_requested",
      notes,
      stage_answers: stageAnswers,
      created_at:    now,
    })
  }

  await Promise.all([
    supabaseServer.from("reviews").update({
      status: "changes_requested", notes, reviewer_id: auth.user.id, reviewed_at: now,
    }).eq("id", params.id),
    supabaseServer.from("tools").update({ status: "draft", updated_at: now }).eq("id", review.tool_id),
  ])

  await writeAuditLog({
    orgId: auth.user.orgId, userId: auth.user.id,
    action: "tool.changes_requested", targetType: "review", targetId: params.id,
    metadata: { tool_id: review.tool_id, notes },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = review.tool as any
  notifySlack(auth.user.orgId, slackMessages.changesRequested(
    t?.title ?? "Unknown", auth.user.name ?? auth.user.email ?? "Unknown",
    t?.classification ?? "", notes
  ))

  // Fire-and-forget email to tool creator
  ;(async () => {
    try {
      const { data: toolRecord } = await supabaseServer
        .from("tools")
        .select("creator_id")
        .eq("id", review.tool_id)
        .single()
      if (toolRecord?.creator_id) {
        const { data: creatorUser } = await supabaseServer
          .from("users")
          .select("email")
          .eq("id", toolRecord.creator_id)
          .single()
        if (creatorUser?.email) {
          let stageName = "Review"
          if (review.current_stage_id) {
            const { data: stageData } = await supabaseServer
              .from("review_stages")
              .select("name")
              .eq("id", review.current_stage_id)
              .single()
            if (stageData?.name) stageName = stageData.name
          }
          sendEmail(
            creatorUser.email,
            `[ForkHub] Changes requested on ${t?.title ?? "your tool"}`,
            changesRequestedEmail({
              creatorEmail: creatorUser.email,
              toolTitle: t?.title ?? "Your tool",
              stageName,
              reviewerName: auth.user.name ?? auth.user.email ?? "A reviewer",
              notes,
              reviewUrl: `${process.env.NEXTAUTH_URL ?? ""}/review/${params.id}`,
            })
          )
        }
      }
    } catch { /* email errors must not block the response */ }
  })()

  return NextResponse.json({ success: true })
}

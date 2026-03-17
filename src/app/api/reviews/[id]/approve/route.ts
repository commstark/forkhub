import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"
import { notifySlack, slackMessages } from "@/lib/slack"
import { getNextStageId } from "@/lib/review-pipeline"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!["reviewer", "admin"].includes(auth.user.role)) {
    return NextResponse.json({ error: "Requires reviewer or admin role" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const notes         = body.notes ?? null
  const stageAnswers  = body.stage_answers ?? {}
  const now           = new Date().toISOString()

  const { data: review } = await supabaseServer
    .from("reviews")
    .select("id, tool_id, current_stage_id, applicable_stages, tool:tools!tool_id(id, org_id, title, classification)")
    .eq("id", params.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!review || (review.tool as any)?.org_id !== auth.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Stage role verification: non-admins must match the stage's assigned_role
  if (review.current_stage_id && auth.user.role !== "admin") {
    const { data: stageRole } = await supabaseServer
      .from("review_stages")
      .select("assigned_role")
      .eq("id", review.current_stage_id)
      .single()
    if (stageRole?.assigned_role && auth.user.role !== stageRole.assigned_role) {
      return NextResponse.json({ error: `This stage requires role: ${stageRole.assigned_role}` }, { status: 403 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = review.tool as any

  // Record stage action if this review is pipeline-aware
  if (review.current_stage_id) {
    await supabaseServer.from("review_actions").insert({
      review_id:     params.id,
      stage_id:      review.current_stage_id,
      actor_id:      auth.user.id,
      action:        "approved",
      notes,
      stage_answers: stageAnswers,
      created_at:    now,
    })

    // Advance to the next stage if one exists
    const nextStageId = getNextStageId(
      (review.applicable_stages as string[]) ?? [],
      review.current_stage_id as string
    )

    if (nextStageId) {
      await supabaseServer
        .from("reviews")
        .update({ current_stage_id: nextStageId, reviewer_id: auth.user.id })
        .eq("id", params.id)

      // Notify Slack that the review has advanced
      notifySlack(auth.user.orgId, {
        title:          t?.title ?? "Unknown",
        creator:        auth.user.name ?? auth.user.email ?? "Unknown",
        classification: t?.classification ?? "",
        status:         "Stage approved — advancing to next stage",
        notes:          notes ?? "",
        url:            `${process.env.NEXTAUTH_URL ?? ""}/review/${params.id}`,
        review_url:     `${process.env.NEXTAUTH_URL ?? ""}/review/${params.id}`,
      })

      return NextResponse.json({ success: true, advanced: true, next_stage_id: nextStageId })
    }
  }

  // Final approval — last stage cleared (or no pipeline configured)
  await Promise.all([
    supabaseServer.from("reviews").update({
      status: "approved", notes, reviewer_id: auth.user.id, reviewed_at: now,
    }).eq("id", params.id),
    supabaseServer.from("tools").update({ status: "approved", updated_at: now }).eq("id", review.tool_id),
  ])

  await writeAuditLog({
    orgId: auth.user.orgId, userId: auth.user.id,
    action: "tool.approved", targetType: "review", targetId: params.id,
    metadata: { tool_id: review.tool_id, notes },
  })

  notifySlack(auth.user.orgId, slackMessages.approved(
    t?.title ?? "Unknown", auth.user.name ?? auth.user.email ?? "Unknown",
    t?.classification ?? "", notes, review.tool_id
  ))

  return NextResponse.json({ success: true, advanced: false })
}

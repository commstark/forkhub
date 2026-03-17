import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"
import { notifySlack, slackMessages } from "@/lib/slack"
import { getNextStageId } from "@/lib/review-pipeline"
import { sendEmail, stageAdvancedEmail, toolApprovedEmail } from "@/lib/email"

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
    .select("id, tool_id, status, current_stage_id, applicable_stages, tool:tools!tool_id(id, org_id, title, classification)")
    .eq("id", params.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!review || (review.tool as any)?.org_id !== auth.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (review.status !== "pending") {
    return NextResponse.json({ error: "Review is no longer pending" }, { status: 409 })
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
      // Optimistic lock: only advance if stage hasn't changed since we read it.
      // If two reviewers approve simultaneously, exactly one will match and advance;
      // the second will get "Review is no longer pending" on re-read or a no-op here.
      const { data: advanced } = await supabaseServer
        .from("reviews")
        .update({ current_stage_id: nextStageId, reviewer_id: auth.user.id })
        .eq("id", params.id)
        .eq("current_stage_id", review.current_stage_id as string)
        .select("id")
        .single()

      if (!advanced) {
        return NextResponse.json({ error: "Review was modified concurrently — please reload" }, { status: 409 })
      }

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

      // Fire-and-forget email to next-stage reviewers (respects notify_email)
      try {
        const { data: nextStage } = await supabaseServer
          .from("review_stages")
          .select("name, assigned_role, notify_email")
          .eq("id", nextStageId)
          .single()
        if (nextStage?.notify_email !== false && nextStage?.assigned_role) {
          const { data: reviewers } = await supabaseServer
            .from("users")
            .select("email")
            .eq("org_id", auth.user.orgId)
            .eq("role", nextStage.assigned_role)
          if (reviewers) {
            const reviewUrl = `${process.env.NEXTAUTH_URL ?? ""}/review/${params.id}`
            for (const reviewer of reviewers) {
              if (reviewer.email) {
                sendEmail(
                  reviewer.email,
                  `[ForkHub] ${t?.title ?? "Tool"} advanced to ${nextStage.name}`,
                  stageAdvancedEmail({
                    reviewerEmail: reviewer.email,
                    toolTitle: t?.title ?? "Unknown",
                    stageName: nextStage.name,
                    approvedByName: auth.user.name ?? auth.user.email ?? "Unknown",
                    reviewUrl,
                  })
                )
              }
            }
          }
        }
      } catch { /* email errors must not block the response */ }

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

  // Fire-and-forget email to tool creator
  ;(async () => {
    try {
      const { data: toolRecord } = await supabaseServer
        .from("tools")
        .select("creator_id, sharing")
        .eq("id", review.tool_id)
        .single()
      if (toolRecord?.creator_id) {
        const { data: creatorUser } = await supabaseServer
          .from("users")
          .select("email")
          .eq("id", toolRecord.creator_id)
          .single()
        if (creatorUser?.email) {
          const base = process.env.NEXTAUTH_URL ?? ""
          const toolUrl = `${base}/tool/${review.tool_id}`
          const liveUrl = toolRecord.sharing === "link" ? `${base}/live/${review.tool_id}` : null
          sendEmail(
            creatorUser.email,
            `[ForkHub] ✓ ${t?.title ?? "Your tool"} is approved`,
            toolApprovedEmail({
              creatorEmail: creatorUser.email,
              toolTitle: t?.title ?? "Your tool",
              toolUrl,
              liveUrl,
            })
          )
        }
      }
    } catch { /* email errors must not block the response */ }
  })()

  return NextResponse.json({ success: true, advanced: false })
}

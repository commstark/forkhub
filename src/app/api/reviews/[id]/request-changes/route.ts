import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"
import { notifySlack, slackMessages } from "@/lib/slack"

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
  const notes = body.notes
  if (!notes?.trim()) return NextResponse.json({ error: "notes is required when requesting changes" }, { status: 400 })

  const now = new Date().toISOString()

  const { data: review } = await supabaseServer
    .from("reviews")
    .select("id, tool_id, tool:tools!tool_id(id, org_id, title)")
    .eq("id", params.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!review || (review.tool as any)?.org_id !== auth.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
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
  const toolTitle = (review.tool as any)?.title ?? "Unknown"
  notifySlack(auth.user.orgId, slackMessages.changesRequested(
    toolTitle, auth.user.name ?? auth.user.email ?? "Unknown", notes
  ))

  return NextResponse.json({ success: true })
}

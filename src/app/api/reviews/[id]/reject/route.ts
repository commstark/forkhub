import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!["reviewer", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Requires reviewer or admin role" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const notes = body.notes
  if (!notes?.trim()) return NextResponse.json({ error: "notes is required for rejection" }, { status: 400 })

  const now = new Date().toISOString()

  const { data: review } = await supabaseServer
    .from("reviews")
    .select("id, tool_id, tool:tools!tool_id(id, org_id)")
    .eq("id", params.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!review || (review.tool as any)?.org_id !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await Promise.all([
    supabaseServer.from("reviews").update({
      status: "rejected", notes, reviewer_id: session.user.id, reviewed_at: now,
    }).eq("id", params.id),
    supabaseServer.from("tools").update({ status: "rejected", updated_at: now }).eq("id", review.tool_id),
  ])

  await writeAuditLog({
    orgId: session.user.orgId, userId: session.user.id,
    action: "tool.rejected", targetType: "review", targetId: params.id,
    metadata: { tool_id: review.tool_id, notes },
  })

  return NextResponse.json({ success: true })
}

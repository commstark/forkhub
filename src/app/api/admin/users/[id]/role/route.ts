import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"

const VALID_ROLES = ["member", "reviewer", "admin"]

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Admin cannot demote themselves
  if (session.user.id === params.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 })
  }

  const { role } = await request.json()
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role. Must be member, reviewer, or admin" }, { status: 400 })
  }

  // Verify target user is in same org
  const { data: target } = await supabaseServer
    .from("users").select("id, role").eq("id", params.id).eq("org_id", session.user.orgId).single()
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const { error } = await supabaseServer
    .from("users").update({ role }).eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAuditLog({
    orgId: session.user.orgId, userId: session.user.id,
    action: "user.role_changed", targetType: "user", targetId: params.id,
    metadata: { from: target.role, to: role },
  })

  return NextResponse.json({ success: true, role })
}

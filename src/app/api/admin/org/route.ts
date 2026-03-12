import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await supabaseServer
    .from("orgs")
    .select("id, name, domain, plan, created_at")
    .eq("id", auth.user.orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const allowed = ["name", "plan"]
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from("orgs").update(updates).eq("id", auth.user.orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAuditLog({
    orgId: auth.user.orgId, userId: auth.user.id,
    action: "org.settings_updated", targetType: "org", targetId: auth.user.orgId,
    metadata: { fields: Object.keys(updates) },
  })

  return NextResponse.json({ success: true })
}

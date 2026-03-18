import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { manager_id } = await request.json().catch(() => ({}))

  // Verify target user is in same org
  const { data: target } = await supabaseServer
    .from("users").select("id").eq("id", params.id).eq("org_id", auth.user.orgId).single()
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // manager_id must be null or a valid user in the same org
  if (manager_id) {
    const { data: manager } = await supabaseServer
      .from("users").select("id").eq("id", manager_id).eq("org_id", auth.user.orgId).single()
    if (!manager) return NextResponse.json({ error: "Manager not found in org" }, { status: 400 })
    if (manager_id === params.id) return NextResponse.json({ error: "A user cannot be their own manager" }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from("users").update({ manager_id: manager_id ?? null }).eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, manager_id: manager_id ?? null })
}

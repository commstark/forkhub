import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const { data, error } = await supabaseServer
    .from("tools")
    .select("id, title, classification, file_type, category, created_at, archived_at, creator_id, creator:users!creator_id(name), archived_by:users!archived_by_id(name)")
    .eq("org_id", auth.user.orgId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

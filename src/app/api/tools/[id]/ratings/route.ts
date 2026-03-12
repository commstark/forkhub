import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify tool belongs to user's org
  const { data: tool } = await supabaseServer
    .from("tools")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data, error } = await supabaseServer
    .from("ratings")
    .select("id, score, comment, created_at, user:users!user_id(name, avatar_url)")
    .eq("tool_id", params.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? "pending"

  // Get all tool IDs in this org that are in review
  const { data: orgTools } = await supabaseServer
    .from("tools")
    .select("id")
    .eq("org_id", session.user.orgId)

  const toolIds = (orgTools ?? []).map((t) => t.id)
  if (toolIds.length === 0) return NextResponse.json([])

  let query = supabaseServer
    .from("reviews")
    .select(`
      id, status, notes, created_at, reviewed_at,
      tool:tools!tool_id(id, title, classification, file_type, category, created_at,
        creator:users!creator_id(name, avatar_url))
    `)
    .in("tool_id", toolIds)
    .order("created_at", { ascending: false })

  if (status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

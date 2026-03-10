import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? "approved"
  const q = searchParams.get("q")
  const category = searchParams.get("category")
  const classification = searchParams.get("classification")
  const fileType = searchParams.get("file_type")
  const sort = searchParams.get("sort") ?? "newest"

  let query = supabaseServer
    .from("tools")
    .select("*, creator:users!creator_id(name, avatar_url)")
    .eq("org_id", session.user.orgId)
    .eq("status", status)

  if (q) {
    query = query.textSearch("search_vector", q, { type: "plain", config: "english" })
  }
  if (category) query = query.eq("category", category)
  if (classification) query = query.eq("classification", classification)
  if (fileType) query = query.eq("file_type", fileType)

  switch (sort) {
    case "most_forked":
      query = query.order("fork_count", { ascending: false })
      break
    case "highest_rated":
      query = query.order("rating_avg", { ascending: false })
      break
    default:
      query = query.order("created_at", { ascending: false })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

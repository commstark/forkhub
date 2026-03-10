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
  const q = searchParams.get("q")?.trim() ?? ""
  const category = searchParams.get("category") || null
  const classification = searchParams.get("classification") || null
  const fileType = searchParams.get("file_type") || null
  const sort = searchParams.get("sort") ?? "newest"

  // When there's a query, use the search_tools RPC for ilike + trigram similarity ordering
  if (q) {
    const { data, error } = await supabaseServer.rpc("search_tools", {
      p_org_id: session.user.orgId,
      p_query: q,
      p_status: status,
      p_category: category,
      p_classification: classification,
      p_file_type: fileType,
      p_sort: sort,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Reshape flat creator columns into nested creator object
    const tools = (data ?? []).map(({ creator_name, creator_avatar_url, ...tool }: {
      creator_name: string
      creator_avatar_url: string | null
      [key: string]: unknown
    }) => ({
      ...tool,
      creator: { name: creator_name, avatar_url: creator_avatar_url },
    }))

    return NextResponse.json(tools)
  }

  // No query — standard filtered query
  let query = supabaseServer
    .from("tools")
    .select("*, creator:users!creator_id(name, avatar_url)")
    .eq("org_id", session.user.orgId)
    .eq("status", status)

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

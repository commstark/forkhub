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
    .select("id, title, description, category, classification, file_type, fork_count, rating_avg, rating_count, version_number, parent_tool_id, creator_id, created_at, creator:users!creator_id(name, avatar_url)")
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

  // Look up parent info for forked tools (single extra query, not N+1)
  const parentIds = (data ?? [])
    .map((t: { parent_tool_id: string | null }) => t.parent_tool_id)
    .filter((id): id is string => !!id)

  const parentMap = new Map<string, { id: string; version_number: number; creator: { name: string } | null }>()
  if (parentIds.length > 0) {
    const { data: parents } = await supabaseServer
      .from("tools")
      .select("id, version_number, creator:users!creator_id(name)")
      .in("id", parentIds)
    for (const p of parents ?? []) {
      parentMap.set(p.id, p as unknown as { id: string; version_number: number; creator: { name: string } | null })
    }
  }

  // Fetch live rating stats — avoids relying on denormalized rating_count/rating_avg
  const toolIds = (data ?? []).map((t: { id: string }) => t.id)
  const ratingMap = new Map<string, { rating_count: number; rating_avg: number }>()
  if (toolIds.length > 0) {
    const { data: ratingRows } = await supabaseServer
      .from("ratings")
      .select("tool_id, score")
      .in("tool_id", toolIds)
    const grouped = new Map<string, number[]>()
    for (const r of ratingRows ?? []) {
      if (!grouped.has(r.tool_id)) grouped.set(r.tool_id, [])
      grouped.get(r.tool_id)!.push(r.score)
    }
    for (const [id, scores] of Array.from(grouped)) {
      ratingMap.set(id, {
        rating_count: scores.length,
        rating_avg: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)),
      })
    }
  }

  const enriched = (data ?? []).map((t: { id: string; parent_tool_id: string | null }) => ({
    ...t,
    parent: (t.parent_tool_id ? parentMap.get(t.parent_tool_id) : null) ?? null,
    ...(ratingMap.get(t.id) ?? { rating_count: 0, rating_avg: 0 }),
  }))

  return NextResponse.json(enriched)
}

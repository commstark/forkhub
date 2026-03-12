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

  const { data: tools, error } = await supabaseServer
    .from("tools")
    .select("id, title, description, category, classification, status, file_type, version_number, fork_count, rating_avg, rating_count, parent_tool_id, created_at")
    .eq("creator_id", params.id)
    .eq("org_id", auth.user.orgId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = tools ?? []

  // Live rating stats
  const toolIds = list.map((t) => t.id)
  const ratingMap = new Map<string, { rating_count: number; rating_avg: number }>()
  if (toolIds.length > 0) {
    const { data: ratingRows } = await supabaseServer
      .from("ratings").select("tool_id, score").in("tool_id", toolIds)
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

  // Parent info
  const parentIds = list.map((t) => t.parent_tool_id).filter((id): id is string => !!id)
  const parentMap = new Map<string, { id: string; version_number: number; creator: { name: string } | null }>()
  if (parentIds.length > 0) {
    const { data: parents } = await supabaseServer
      .from("tools").select("id, version_number, creator:users!creator_id(name)").in("id", parentIds)
    for (const p of parents ?? []) {
      parentMap.set(p.id, p as unknown as { id: string; version_number: number; creator: { name: string } | null })
    }
  }

  // Review IDs for in_review tools
  const inReviewIds = list.filter((t) => t.status === "in_review").map((t) => t.id)
  const reviewMap = new Map<string, string>()
  if (inReviewIds.length > 0) {
    const { data: reviews } = await supabaseServer
      .from("reviews").select("id, tool_id").in("tool_id", inReviewIds)
      .eq("status", "pending").order("created_at", { ascending: false })
    for (const r of reviews ?? []) {
      if (!reviewMap.has(r.tool_id)) reviewMap.set(r.tool_id, r.id)
    }
  }

  const result = list.map((t) => ({
    ...t,
    ...(ratingMap.get(t.id) ?? { rating_count: 0, rating_avg: 0 }),
    parent: (t.parent_tool_id ? parentMap.get(t.parent_tool_id) : null) ?? null,
    review_id: reviewMap.get(t.id) ?? null,
  }))

  return NextResponse.json(result)
}

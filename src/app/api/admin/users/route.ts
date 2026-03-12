import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: users, error } = await supabaseServer
    .from("users")
    .select("id, name, email, avatar_url, role, department, created_at")
    .eq("org_id", auth.user.orgId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = users ?? []

  // Per-user tool stats
  const { data: tools } = await supabaseServer
    .from("tools")
    .select("id, creator_id, parent_tool_id")
    .eq("org_id", auth.user.orgId)
    .eq("status", "approved")

  const toolsByUser = new Map<string, { id: string; parent_tool_id: string | null }[]>()
  for (const t of tools ?? []) {
    if (!toolsByUser.has(t.creator_id)) toolsByUser.set(t.creator_id, [])
    toolsByUser.get(t.creator_id)!.push(t)
  }

  // Live rating stats
  const allToolIds = (tools ?? []).map((t) => t.id)
  const ratingByTool = new Map<string, number[]>()
  if (allToolIds.length > 0) {
    const { data: ratingRows } = await supabaseServer
      .from("ratings").select("tool_id, score").in("tool_id", allToolIds)
    for (const r of ratingRows ?? []) {
      if (!ratingByTool.has(r.tool_id)) ratingByTool.set(r.tool_id, [])
      ratingByTool.get(r.tool_id)!.push(r.score)
    }
  }

  const result = list.map((u) => {
    const userTools = toolsByUser.get(u.id) ?? []
    const originals = userTools.filter((t) => !t.parent_tool_id)
    const forksMade = userTools.filter((t) => !!t.parent_tool_id)
    const allScores = userTools.flatMap((t) => ratingByTool.get(t.id) ?? [])
    const totalRatings = allScores.length
    const avgRating    = totalRatings > 0
      ? parseFloat((allScores.reduce((a, b) => a + b, 0) / totalRatings).toFixed(2))
      : 0
    return {
      ...u,
      stats: {
        originals:     originals.length,
        forks_made:    forksMade.length,
        avg_rating:    avgRating,
        total_ratings: totalRatings,
      },
    }
  })

  return NextResponse.json(result)
}

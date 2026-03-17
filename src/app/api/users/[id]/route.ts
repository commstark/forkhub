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

  // Fetch user — must be in same org
  const { data: user, error } = await supabaseServer
    .from("users")
    .select("id, name, email, avatar_url, role, department, created_at, org_id")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (error || !user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Fetch all tools by this user in this org
  const { data: tools } = await supabaseServer
    .from("tools")
    .select("id, status, fork_count, parent_tool_id")
    .eq("creator_id", params.id)
    .eq("org_id", auth.user.orgId)

  const allTools      = tools ?? []
  const totalTools    = allTools.length
  const totalForksMade = allTools.filter((t) => t.parent_tool_id !== null).length
  const totalForkedByOthers = allTools.reduce((sum, t) => sum + (t.fork_count ?? 0), 0)

  // Live rating stats from ratings table for accuracy
  const toolIds = allTools.map((t) => t.id)
  let totalRatings = 0
  let avgRating    = 0

  if (toolIds.length > 0) {
    const { data: ratingRows } = await supabaseServer
      .from("ratings")
      .select("score")
      .in("tool_id", toolIds)
    const scores = (ratingRows ?? []).map((r) => r.score)
    totalRatings = scores.length
    avgRating    = totalRatings > 0
      ? parseFloat((scores.reduce((a, b) => a + b, 0) / totalRatings).toFixed(2))
      : 0
  }

  return NextResponse.json({
    id:         user.id,
    name:       user.name,
    email:      user.email,
    // Return the proxy URL so the browser never hits raw Supabase storage directly.
    avatar_url: user.avatar_url ? `/api/users/${user.id}/avatar` : null,
    role:       user.role,
    department: (user as { department?: string | null }).department ?? null,
    created_at: user.created_at,
    stats: {
      total_tools:            totalTools,
      total_forks_made:       totalForksMade,
      total_forked_by_others: totalForkedByOthers,
      avg_rating:             avgRating,
      total_ratings:          totalRatings,
    },
  })
}

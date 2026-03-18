import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? "pending"

  // Get all tool IDs in this org that are in review
  const { data: orgTools } = await supabaseServer
    .from("tools")
    .select("id")
    .eq("org_id", auth.user.orgId)

  const toolIds = (orgTools ?? []).map((t) => t.id)
  if (toolIds.length === 0) return NextResponse.json([])

  let query = supabaseServer
    .from("reviews")
    .select(`
      id, status, notes, created_at, reviewed_at,
      current_stage_id, applicable_stages,
      tool:tools!tool_id(id, title, classification, file_type, category, created_at, creator_id,
        creator:users!creator_id(name, avatar_url))
    `)
    .in("tool_id", toolIds)
    .order("created_at", { ascending: false })

  if (status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reviews = data ?? []

  // Batch-fetch all unique stage IDs referenced in these reviews
  const uniqueStageIds = Array.from(new Set(
    reviews.map((r) => r.current_stage_id).filter(Boolean)
  )) as string[]

  type StageInfo = { id: string; name: string; stage_order: number; assigned_role: string }
  const stageMap: Record<string, StageInfo> = {}
  if (uniqueStageIds.length > 0) {
    const { data: stages } = await supabaseServer
      .from("review_stages")
      .select("id, name, stage_order, assigned_role")
      .in("id", uniqueStageIds)
    for (const s of stages ?? []) stageMap[s.id] = s
  }

  // Keep only the most recent review per tool — if a tool was resubmitted after
  // "changes_requested" a new review row is created; old rows must not appear.
  // The query is already ordered by created_at desc, so first-seen wins.
  const seenToolIds = new Set<string>()
  const latestReviews = reviews.filter((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolId = (r.tool as any)?.id as string | undefined
    if (!toolId || seenToolIds.has(toolId)) return false
    seenToolIds.add(toolId)
    return true
  })

  // Attach stage info
  const mapped = latestReviews.map((r) => {
    const currentStage = r.current_stage_id ? stageMap[r.current_stage_id] : null
    const totalStages  = (r.applicable_stages as string[] | null)?.length ?? 0
    const stageIndex   = totalStages > 0 && r.current_stage_id
      ? ((r.applicable_stages as string[]).indexOf(r.current_stage_id) + 1)
      : null
    const stageInfo = currentStage && stageIndex
      ? `Stage ${stageIndex} of ${totalStages}: ${currentStage.name}`
      : null
    return { ...r, stage_info: stageInfo, current_stage: currentStage }
  })

  // For manager-stage reviews, build a map of creator_id → manager_id so we can
  // filter visibility correctly without an N+1 query.
  const creatorManagerMap: Record<string, string | null> = {}
  if (auth.user.role !== "admin") {
    const managerStageCreatorIds = Array.from(new Set(
      mapped
        .filter((r) => r.current_stage?.assigned_role === "manager")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r) => (r.tool as any)?.creator_id as string | undefined)
        .filter(Boolean)
    )) as string[]
    if (managerStageCreatorIds.length > 0) {
      const { data: creators } = await supabaseServer
        .from("users")
        .select("id, manager_id")
        .in("id", managerStageCreatorIds)
      for (const c of creators ?? []) creatorManagerMap[c.id] = c.manager_id
    }
  }

  const enriched = mapped.filter((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creatorId = (r.tool as any)?.creator_id as string | undefined
    // Creators never see their own tool in the review queue (conflict of interest)
    if (creatorId === auth.user.id) return false
    if (auth.user.role === "admin") return true
    // Reviews without a pipeline stage are visible to all reviewers (legacy)
    if (!r.current_stage_id || !r.current_stage) return true
    if (r.current_stage.assigned_role === "manager") {
      // Only the tool creator's manager sees this review
      if (!creatorId) return false
      return creatorManagerMap[creatorId] === auth.user.id
    }
    return r.current_stage.assigned_role === auth.user.role
  })

  return NextResponse.json(enriched)
}

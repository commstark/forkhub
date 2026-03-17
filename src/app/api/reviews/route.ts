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

  // Attach stage info and filter by role for non-admins
  const enriched = reviews
    .map((r) => {
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
    .filter((r) => {
      if (auth.user.role === "admin") return true
      // Reviewers only see reviews at stages matching their assigned role,
      // or reviews without a pipeline (legacy / no stages configured)
      if (!r.current_stage_id || !r.current_stage) return true
      return r.current_stage.assigned_role === auth.user.role
    })

  return NextResponse.json(enriched)
}

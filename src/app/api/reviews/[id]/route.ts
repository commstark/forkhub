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

  const { data, error } = await supabaseServer
    .from("reviews")
    .select(`
      id, status, notes, security_doc, created_at, reviewed_at,
      current_stage_id, applicable_stages, stage_responses,
      tool:tools!tool_id(*, creator:users!creator_id(name, avatar_url)),
      reviewer:users!reviewer_id(name, avatar_url)
    `)
    .eq("id", params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Verify tool belongs to user's org
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((data.tool as any)?.org_id !== auth.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Fetch current stage details and all stage actions if pipeline is active
  let currentStage = null
  let stageActions: unknown[] = []

  if (data.current_stage_id) {
    const { data: stage } = await supabaseServer
      .from("review_stages")
      .select("id, name, stage_order, assigned_role, custom_questions, applies_to_classifications")
      .eq("id", data.current_stage_id)
      .single()
    currentStage = stage

    const { data: actions } = await supabaseServer
      .from("review_actions")
      .select("id, stage_id, action, notes, stage_answers, created_at, actor:users!actor_id(name, avatar_url)")
      .eq("review_id", params.id)
      .order("created_at", { ascending: true })
    stageActions = actions ?? []
  }

  return NextResponse.json({ ...data, current_stage: currentStage, stage_actions: stageActions })
}

import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: userId, orgId } = session.user
  const toolId = params.id

  const body = await request.json()
  const score = Number(body.score)
  const comment = body.comment ?? null

  if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
    return NextResponse.json({ error: "score must be an integer between 1 and 5" }, { status: 400 })
  }

  // Verify tool belongs to user's org
  const { data: tool } = await supabaseServer
    .from("tools")
    .select("id, creator_id")
    .eq("id", toolId)
    .eq("org_id", orgId)
    .single()

  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Creator cannot rate their own tool
  if (tool.creator_id === userId) {
    return NextResponse.json({ error: "You cannot rate your own tool" }, { status: 403 })
  }

  // Upsert rating (unique constraint on tool_id + user_id)
  const { error: ratingError } = await supabaseServer
    .from("ratings")
    .upsert({ tool_id: toolId, user_id: userId, score, comment }, { onConflict: "tool_id,user_id" })

  if (ratingError) return NextResponse.json({ error: ratingError.message }, { status: 500 })

  // Recalculate rating_avg and rating_count
  const { data: stats } = await supabaseServer
    .from("ratings")
    .select("score")
    .eq("tool_id", toolId)

  if (stats && stats.length > 0) {
    const avg = stats.reduce((sum, r) => sum + r.score, 0) / stats.length
    await supabaseServer
      .from("tools")
      .update({ rating_avg: parseFloat(avg.toFixed(2)), rating_count: stats.length })
      .eq("id", toolId)
  }

  await writeAuditLog({
    orgId,
    userId,
    action: "tool.rated",
    targetType: "tool",
    targetId: toolId,
    metadata: { action: "rated", score },
  })

  return NextResponse.json({ success: true })
}

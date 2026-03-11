import "server-only"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: tools, error } = await supabaseServer
    .from("tools")
    .select("id, title, description, category, classification, status, file_type, file_name, file_size, version_number, rating_avg, rating_count, created_at")
    .eq("creator_id", session.user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 })

  // For in_review tools, attach the latest pending review ID so the page can link directly
  const inReviewIds = (tools ?? []).filter((t) => t.status === "in_review").map((t) => t.id)

  const reviewMap: Map<string, string> = new Map()
  if (inReviewIds.length > 0) {
    const { data: reviews } = await supabaseServer
      .from("reviews")
      .select("id, tool_id")
      .in("tool_id", inReviewIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    // Keep first (most recent) per tool
    for (const r of reviews ?? []) {
      if (!reviewMap.has(r.tool_id)) reviewMap.set(r.tool_id, r.id)
    }
  }

  const result = (tools ?? []).map((tool) => ({
    ...tool,
    review_id: reviewMap.get(tool.id) ?? null,
  }))

  return NextResponse.json(result)
}

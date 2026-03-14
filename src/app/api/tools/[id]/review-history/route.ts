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

  // Verify tool belongs to user's org
  const { data: tool } = await supabaseServer
    .from("tools")
    .select("id, title, creator_id, creator:users!creator_id(name, avatar_url)")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data, error } = await supabaseServer
    .from("reviews")
    .select(`
      id, status, notes, security_doc, created_at, reviewed_at,
      reviewer:users!reviewer_id(name, avatar_url)
    `)
    .eq("tool_id", params.id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Pull change_description out of security_doc to the top level for convenience
  const reviews = (data ?? []).map((r) => ({
    ...r,
    change_description: (r.security_doc as Record<string, unknown> | null)?.change_description ?? null,
  }))

  return NextResponse.json({
    tool: { id: tool.id, title: tool.title, creator: tool.creator },
    reviews,
  })
}

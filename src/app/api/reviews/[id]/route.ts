import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseServer
    .from("reviews")
    .select(`
      id, status, notes, security_doc, created_at, reviewed_at,
      tool:tools!tool_id(*, creator:users!creator_id(name, avatar_url)),
      reviewer:users!reviewer_id(name, avatar_url)
    `)
    .eq("id", params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Verify tool belongs to user's org
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((data.tool as any)?.org_id !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(data)
}

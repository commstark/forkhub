import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

type LineageNode = {
  id: string
  title: string
  version_number: number
  parent_tool_id: string | null
  creator: { name: string } | null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Walk up the ancestor chain from current tool to root (max 20 to prevent loops)
  const chain: LineageNode[] = []
  let currentId: string | null = params.id
  const visited = new Set<string>()

  while (currentId && !visited.has(currentId) && chain.length < 20) {
    visited.add(currentId)
    const result = await supabaseServer
      .from("tools")
      .select("id, title, version_number, parent_tool_id, creator:users!creator_id(name)")
      .eq("id", currentId)
      .eq("org_id", session.user.orgId)
      .single()

    if (result.error || !result.data) break
    const node = result.data as unknown as LineageNode
    chain.unshift(node) // prepend so result is root-first
    currentId = node.parent_tool_id
  }

  return NextResponse.json(chain)
}

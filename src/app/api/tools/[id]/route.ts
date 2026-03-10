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
    .from("tools")
    .select("*, creator:users!creator_id(name, avatar_url)")
    .eq("id", params.id)
    .eq("org_id", session.user.orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(data)
}

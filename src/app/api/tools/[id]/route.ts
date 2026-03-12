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
    .from("tools")
    .select("*, creator:users!creator_id(name, avatar_url)")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(data)
}

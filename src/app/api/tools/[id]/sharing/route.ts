import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseServer
    .from("tools")
    .select("id, sharing")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ sharing: data.sharing ?? "private" })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const mode = body?.mode

  if (!["private", "link", "public"].includes(mode)) {
    return NextResponse.json(
      { error: "mode must be 'private', 'link', or 'public'" },
      { status: 400 }
    )
  }

  const { data: tool, error } = await supabaseServer
    .from("tools")
    .select("id, creator_id, status, sharing, org_id")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (error || !tool) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (tool.creator_id !== auth.user.id && auth.user.role !== "admin") {
    return NextResponse.json(
      { error: "Only the tool creator or an admin can change sharing" },
      { status: 403 }
    )
  }

  if (tool.status !== "approved") {
    return NextResponse.json(
      { error: "Tool must be approved before its sharing mode can be changed" },
      { status: 422 }
    )
  }

  const { error: updateError } = await supabaseServer
    .from("tools")
    .update({ sharing: mode })
    .eq("id", params.id)

  if (updateError) {
    return NextResponse.json({ error: "Failed to update sharing mode" }, { status: 500 })
  }

  await writeAuditLog({
    orgId:      auth.user.orgId,
    userId:     auth.user.id,
    action:     "tool.sharing_changed",
    targetType: "tool",
    targetId:   params.id,
    metadata:   { from: tool.sharing ?? "private", to: mode },
  })

  return NextResponse.json({ sharing: mode })
}

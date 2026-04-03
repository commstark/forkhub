import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: userId, orgId, role } = auth.user

  const { data: tool, error: fetchError } = await supabaseServer
    .from("tools")
    .select("id, creator_id, sharing, archived_at, title")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .single()

  if (fetchError || !tool) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (tool.creator_id !== userId && role !== "admin") {
    return NextResponse.json(
      { error: "Only the tool creator or an admin can archive this tool" },
      { status: 403 }
    )
  }

  if (tool.archived_at) {
    return NextResponse.json({ error: "Tool is already archived" }, { status: 400 })
  }

  // Revoke sharing so the live URL stops working
  const prevSharing = (tool.sharing ?? "private") as string
  const updates: Record<string, unknown> = {
    archived_at:    new Date().toISOString(),
    archived_by_id: userId,
  }
  if (prevSharing === "link" || prevSharing === "public") {
    updates.sharing = "private"
  }

  const { data: updated, error: updateError } = await supabaseServer
    .from("tools")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: "Failed to archive tool" }, { status: 500 })

  await writeAuditLog({
    orgId,
    userId,
    action:     "tool.archived",
    targetType: "tool",
    targetId:   params.id,
    metadata:   {
      title:           tool.title as string,
      sharing_revoked: prevSharing !== "private" ? prevSharing : null,
    },
  })

  return NextResponse.json(updated)
}

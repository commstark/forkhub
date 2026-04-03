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

  if (auth.user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can unarchive tools" }, { status: 403 })
  }

  const { id: userId, orgId } = auth.user

  const { data: tool, error: fetchError } = await supabaseServer
    .from("tools")
    .select("id, archived_at, title")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .single()

  if (fetchError || !tool) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!tool.archived_at) {
    return NextResponse.json({ error: "Tool is not archived" }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabaseServer
    .from("tools")
    .update({ archived_at: null, archived_by_id: null })
    .eq("id", params.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: "Failed to unarchive tool" }, { status: 500 })

  await writeAuditLog({
    orgId,
    userId,
    action:     "tool.unarchived",
    targetType: "tool",
    targetId:   params.id,
    metadata:   { title: tool.title as string },
  })

  return NextResponse.json(updated)
}

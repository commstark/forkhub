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
    .select("*, creator:users!creator_id(name, avatar_url)")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { title, description, category } = body

  if (!title && !description && !category) {
    return NextResponse.json(
      { error: "Provide at least one of: title, description, category" },
      { status: 400 }
    )
  }

  const { data: tool, error: fetchError } = await supabaseServer
    .from("tools")
    .select("id, creator_id, status, title, description, category, org_id")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (fetchError || !tool) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (tool.creator_id !== auth.user.id && auth.user.role !== "admin") {
    return NextResponse.json(
      { error: "Only the tool creator or an admin can update metadata" },
      { status: 403 }
    )
  }

  if (tool.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved tools can have metadata patched — use the normal upload/fork flow for drafts" },
      { status: 422 }
    )
  }

  const updates: Record<string, string> = {}
  if (title) updates.title = title
  if (description) updates.description = description
  if (category) updates.category = category

  const { data: updated, error: updateError } = await supabaseServer
    .from("tools")
    .update(updates)
    .eq("id", params.id)
    .select("id, title, description, category, status, classification, version_number, updated_at")
    .single()

  if (updateError) return NextResponse.json({ error: "Failed to update metadata" }, { status: 500 })

  await writeAuditLog({
    orgId: auth.user.orgId,
    userId: auth.user.id,
    action: "tool.metadata_updated",
    targetType: "tool",
    targetId: params.id,
    metadata: {
      before: {
        title: tool.title,
        description: tool.description,
        category: tool.category,
      },
      after: updates,
    },
  })

  return NextResponse.json(updated)
}

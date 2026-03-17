import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

const VALID_ROLES = ["reviewer", "admin"]
const VALID_CLASSIFICATIONS = ["internal_noncustomer", "internal_customer", "external_customer"]

export async function PUT(
  request: NextRequest,
  ctx: { params: { id: string } }
) { return PATCH(request, ctx) }

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

  // Verify stage belongs to this org
  const { data: stage } = await supabaseServer
    .from("review_stages")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const allowed = ["name", "stage_order", "assigned_role", "applies_to_classifications", "custom_questions", "notify_email", "notify_slack"]
  const updates: Record<string, unknown> = {}

  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (updates.name && !(updates.name as string).trim()) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 })
  }
  if (updates.assigned_role && !VALID_ROLES.includes(updates.assigned_role as string)) {
    return NextResponse.json({ error: `assigned_role must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 })
  }
  if (updates.applies_to_classifications) {
    const invalid = (updates.applies_to_classifications as string[]).filter((c) => !VALID_CLASSIFICATIONS.includes(c))
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid classifications: ${invalid.join(", ")}` }, { status: 400 })
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from("review_stages")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `stage_order ${updates.stage_order} already exists` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const { data: stage } = await supabaseServer
    .from("review_stages")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: deleted } = await supabaseServer
    .from("review_stages")
    .select("stage_order")
    .eq("id", params.id)
    .single()

  const { error } = await supabaseServer
    .from("review_stages")
    .delete()
    .eq("id", params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Close the gap: re-number remaining stages sequentially
  if (deleted) {
    const { data: remaining } = await supabaseServer
      .from("review_stages")
      .select("id, stage_order")
      .eq("org_id", auth.user.orgId)
      .order("stage_order", { ascending: true })

    if (remaining && remaining.length > 0) {
      // Temp-offset to avoid UNIQUE conflicts during renumbering
      for (const s of remaining) {
        await supabaseServer.from("review_stages").update({ stage_order: s.stage_order + 100000 }).eq("id", s.id)
      }
      for (let i = 0; i < remaining.length; i++) {
        await supabaseServer.from("review_stages").update({ stage_order: i + 1 }).eq("id", remaining[i].id)
      }
    }
  }

  return NextResponse.json({ success: true })
}

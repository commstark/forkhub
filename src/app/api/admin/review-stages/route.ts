import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

const VALID_ROLES = ["reviewer", "admin"]
const VALID_CLASSIFICATIONS = ["internal_noncustomer", "internal_customer", "external_customer"]

export async function GET(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseServer
    .from("review_stages")
    .select("id, name, stage_order, assigned_role, applies_to_classifications, custom_questions, notify_email, notify_slack, created_at")
    .eq("org_id", auth.user.orgId)
    .order("stage_order", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { name, stage_order, assigned_role, applies_to_classifications, custom_questions, notify_email, notify_slack } = body

  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 })
  if (assigned_role && !VALID_ROLES.includes(assigned_role)) {
    return NextResponse.json({ error: `assigned_role must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 })
  }
  if (applies_to_classifications) {
    const invalid = applies_to_classifications.filter((c: string) => !VALID_CLASSIFICATIONS.includes(c))
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid classifications: ${invalid.join(", ")}` }, { status: 400 })
    }
  }

  // Auto-assign next stage_order if not provided
  let resolvedOrder = stage_order
  if (resolvedOrder === undefined || resolvedOrder === null) {
    const { data: existing } = await supabaseServer
      .from("review_stages")
      .select("stage_order")
      .eq("org_id", auth.user.orgId)
      .order("stage_order", { ascending: false })
      .limit(1)
    resolvedOrder = ((existing?.[0]?.stage_order) ?? 0) + 1
  }

  const { data, error } = await supabaseServer
    .from("review_stages")
    .insert({
      org_id:                    auth.user.orgId,
      name:                      name.trim(),
      stage_order:               resolvedOrder,
      assigned_role:             assigned_role ?? "reviewer",
      applies_to_classifications: applies_to_classifications ?? [],
      custom_questions:          custom_questions ?? [],
      notify_email:              notify_email ?? true,
      notify_slack:              notify_slack ?? true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `stage_order ${stage_order} already exists — choose a different order number` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

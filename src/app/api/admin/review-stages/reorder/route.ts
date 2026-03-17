import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!Array.isArray(body) || body.some((x) => typeof x.id !== "string" || typeof x.stage_order !== "number")) {
    return NextResponse.json({ error: "Body must be [{id, stage_order}]" }, { status: 400 })
  }

  // Verify all stage IDs belong to this org
  const ids = body.map((x) => x.id)
  const { data: existing } = await supabaseServer
    .from("review_stages")
    .select("id")
    .eq("org_id", auth.user.orgId)
    .in("id", ids)

  if ((existing ?? []).length !== ids.length) {
    return NextResponse.json({ error: "One or more stage IDs not found" }, { status: 404 })
  }

  // Temp-offset all affected stages to clear UNIQUE constraint conflicts,
  // then apply the real orders. Not atomic but safe for this use case.
  for (const { id } of body) {
    await supabaseServer
      .from("review_stages")
      .update({ stage_order: Date.now() + Math.floor(Math.random() * 9999) })
      .eq("id", id)
  }
  for (const { id, stage_order } of body) {
    await supabaseServer
      .from("review_stages")
      .update({ stage_order })
      .eq("id", id)
  }

  const { data } = await supabaseServer
    .from("review_stages")
    .select("id, name, stage_order, assigned_role, applies_to_classifications, custom_questions, notify_email, notify_slack")
    .eq("org_id", auth.user.orgId)
    .order("stage_order", { ascending: true })

  return NextResponse.json(data ?? [])
}

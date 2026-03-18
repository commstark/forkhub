import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be a JSON object (security_doc)" }, { status: 400 })
  }

  const { data: review } = await supabaseServer
    .from("reviews")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (!review) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { error } = await supabaseServer
    .from("reviews")
    .update({ security_doc: body })
    .eq("id", params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be a JSON object (security_doc)" }, { status: 400 })
  }

  // Verify review's tool belongs to user's org
  const { data: review } = await supabaseServer
    .from("reviews")
    .select("id, tool:tools!tool_id(org_id)")
    .eq("id", params.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!review || (review.tool as any)?.org_id !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { error } = await supabaseServer
    .from("reviews")
    .update({ security_doc: body })
    .eq("id", params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

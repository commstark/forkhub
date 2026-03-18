import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { createHash, randomBytes } from "crypto"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Verify target user is in same org
  const { data: target } = await supabaseServer
    .from("users").select("id, org_id").eq("id", params.id).eq("org_id", auth.user.orgId).single()
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const name = (body.name as string)?.trim() || "Admin-generated key"

  const raw    = randomBytes(24).toString("base64url")
  const token  = `sk_fh_${raw}`
  const hash   = createHash("sha256").update(token).digest("hex")
  const prefix = token.slice(0, 12)

  const { data: keyRow, error } = await supabaseServer
    .from("api_keys")
    .insert({ user_id: params.id, org_id: auth.user.orgId, name, key_hash: hash, key_prefix: prefix })
    .select("id, name, key_prefix, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...keyRow, token }, { status: 201 })
}

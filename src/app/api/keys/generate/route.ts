import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"
import { createHash, randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name: string = (body.name as string)?.trim() || "My API Key"

  // Generate: sk_fh_ + 32 random base64url chars
  const raw    = randomBytes(24).toString("base64url") // 24 bytes → 32 base64url chars
  const token  = `sk_fh_${raw}`
  const hash   = createHash("sha256").update(token).digest("hex")
  const prefix = token.slice(0, 12) // "sk_fh_" + first 6 chars

  const { data: keyRow, error } = await supabaseServer
    .from("api_keys")
    .insert({
      user_id:    auth.user.id,
      org_id:     auth.user.orgId,
      name,
      key_hash:   hash,
      key_prefix: prefix,
    })
    .select("id, name, key_prefix, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAuditLog({
    orgId:      auth.user.orgId,
    userId:     auth.user.id,
    action:     "api_key.created",
    targetType: "api_key",
    targetId:   keyRow.id,
    metadata:   { name, prefix },
  })

  // Return the full token ONCE — never stored, never retrievable again
  return NextResponse.json({ ...keyRow, token }, { status: 201 })
}

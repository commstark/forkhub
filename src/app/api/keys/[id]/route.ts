import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify ownership
  const { data: keyRow } = await supabaseServer
    .from("api_keys")
    .select("id, name, prefix, user_id")
    .eq("id", params.id)
    .single()

  if (!keyRow) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (keyRow.user_id !== auth.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { error } = await supabaseServer
    .from("api_keys")
    .delete()
    .eq("id", params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAuditLog({
    orgId:      auth.user.orgId,
    userId:     auth.user.id,
    action:     "api_key.revoked",
    targetType: "api_key",
    targetId:   params.id,
    metadata:   { name: keyRow.name, prefix: keyRow.prefix },
  })

  return NextResponse.json({ success: true })
}

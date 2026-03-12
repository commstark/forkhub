import "server-only"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"
import { createHash } from "crypto"
import { NextRequest } from "next/server"

export type AuthUser = {
  id: string
  orgId: string
  role: "admin" | "member" | "reviewer"
  name?: string
  email?: string
}

export type AuthContext = { user: AuthUser }

/**
 * Resolves auth from either:
 *   1. NextAuth session cookie (browser / SSR)
 *   2. Authorization: Bearer sk_fh_<key> header (API key)
 *
 * Returns null if neither is valid.
 */
export async function getAuth(request?: NextRequest): Promise<AuthContext | null> {
  // ── 1. Session cookie ──────────────────────────────────────────────────────
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    return {
      user: {
        id:     session.user.id,
        orgId:  session.user.orgId,
        role:   session.user.role,
        name:   session.user.name  ?? undefined,
        email:  session.user.email ?? undefined,
      },
    }
  }

  // ── 2. Bearer API key ──────────────────────────────────────────────────────
  const authHeader =
    request?.headers.get("Authorization") ??
    request?.headers.get("authorization")

  if (!authHeader?.startsWith("Bearer sk_fh_")) return null

  const token = authHeader.slice(7) // strip "Bearer "
  const hash  = createHash("sha256").update(token).digest("hex")

  const { data: keyRow } = await supabaseServer
    .from("api_keys")
    .select("id, user_id, org_id")
    .eq("key_hash", hash)
    .single()

  if (!keyRow) return null

  const { data: user } = await supabaseServer
    .from("users")
    .select("id, org_id, role, name, email")
    .eq("id", keyRow.user_id)
    .single()

  if (!user) return null

  // Update last_used_at — fire and forget, never block the request
  supabaseServer
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id)
    .then(() => {}, () => {})

  return {
    user: {
      id:    user.id,
      orgId: user.org_id,
      role:  user.role as "admin" | "member" | "reviewer",
      name:  user.name  ?? undefined,
      email: user.email ?? undefined,
    },
  }
}

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
 *   1. Authorization: Bearer sk_fh_<key> header (API key — checked first)
 *   2. NextAuth session cookie (browser / SSR — fallback)
 *
 * Returns null if neither is valid.
 *
 * Bearer is checked first so API key requests never hit the NextAuth session
 * lookup (which requires a DB round-trip and can cause 504s on slow connections).
 * If a Bearer header is present but invalid, we return null immediately rather
 * than falling through to cookie auth.
 */
export async function getAuth(request?: NextRequest): Promise<AuthContext | null> {
  // ── 1. Bearer API key (API clients, curl, MCP) ─────────────────────────────
  const authHeader =
    request?.headers.get("Authorization") ??
    request?.headers.get("authorization")

  if (authHeader?.startsWith("Bearer sk_fh_")) {
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

  // ── 2. Session cookie (browser / SSR) ──────────────────────────────────────
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

  return null
}

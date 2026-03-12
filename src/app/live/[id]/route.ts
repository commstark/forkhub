import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

// ─── Simple in-memory rate limiter: 100 req/min per IP ────────────────────────
// Note: resets per process — won't coordinate across multiple Vercel instances,
// but still provides meaningful protection against abuse from a single client.
const rl = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rl.get(ip)
  if (!entry || now > entry.resetAt) {
    rl.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (entry.count >= 100) return true
  entry.count++
  return false
}

// ─── Response helpers ─────────────────────────────────────────────────────────

const SECURITY_HEADERS = {
  // Prevent embedding in iframes on other origins
  "X-Frame-Options": "SAMEORIGIN",
  // Allow the tool's own scripts/styles/resources to run freely (it's a reviewed tool)
  "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors 'self'",
  "X-Content-Type-Options": "nosniff",
}

function notFoundPage(): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html><head><title>Not Found</title></head><body style="font-family:sans-serif;padding:40px;color:#333"><h2>404 — Tool not found</h2><p>This tool does not exist or is not available.</p></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS } }
  )
}

function notHtmlPage(toolId: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preview unavailable</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f6f3; color: #1c1917; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { text-align: center; padding: 48px 32px; max-width: 480px; }
    h2 { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
    p  { font-size: 14px; color: #78716c; margin: 0 0 24px; line-height: 1.6; }
    a  { display: inline-block; background: #c2724f; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; }
    a:hover { background: #a05c3a; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Preview unavailable</h2>
    <p>This tool type cannot be previewed live. Download it from The Fork Hub.</p>
    <a href="/tool/${toolId}">View on The Fork Hub</a>
  </div>
</body>
</html>`
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS },
  })
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"

  if (isRateLimited(ip)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    })
  }

  // Fetch tool — no org scoping here because link-shared tools are accessible
  // to anyone with the URL, across orgs. We query by ID only.
  const { data: tool, error } = await supabaseServer
    .from("tools")
    .select("id, org_id, title, status, sharing, file_name, file_type")
    .eq("id", params.id)
    .single()

  if (error || !tool) return notFoundPage()

  // Only approved tools can be served live
  if (tool.status !== "approved") return notFoundPage()

  const sharing = tool.sharing ?? "private"

  // Private: require org member authentication
  if (sharing === "private") {
    const auth = await getAuth(request)
    if (!auth || auth.user.orgId !== tool.org_id) {
      // Redirect to login with return path
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=/live/${params.id}`, request.url),
        302
      )
    }
  }
  // link / public: no auth required — UUID is effectively unguessable (128-bit)

  // Check if the file is HTML
  const name = (tool.file_name ?? "").toLowerCase()
  const mime = tool.file_type ?? ""
  const isHtml =
    mime === "text/html" || name.endsWith(".html") || name.endsWith(".htm")

  if (!isHtml) return notHtmlPage(params.id)

  // Fetch the file from Supabase Storage
  const storagePath = `${tool.org_id}/${tool.id}/${tool.file_name}`
  const { data: blob, error: storageError } = await supabaseServer.storage
    .from("tool-files")
    .download(storagePath)

  if (storageError || !blob) return notFoundPage()

  const html = await blob.text()

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": sharing === "private" ? "private, no-store" : "public, max-age=60",
      ...SECURITY_HEADERS,
    },
  })
}

import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

// ─── Rate limiter: 100 req/min per IP ─────────────────────────────────────────
const rl = new Map<string, { count: number; resetAt: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rl.get(ip)
  if (!entry || now > entry.resetAt) { rl.set(ip, { count: 1, resetAt: now + 60_000 }); return false }
  if (entry.count >= 100) return true
  entry.count++
  return false
}

// ─── Security headers ─────────────────────────────────────────────────────────
const SEC = {
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors 'self'",
  "X-Content-Type-Options": "nosniff",
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────
function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function footerHtml(toolId: string, toolTitle: string): string {
  const base = process.env.NEXTAUTH_URL ?? ""
  return `<div style="position:fixed;bottom:0;left:0;right:0;height:30px;display:flex;align-items:center;justify-content:flex-end;padding:0 16px;background:rgba(248,246,243,0.93);backdrop-filter:blur(4px);border-top:1px solid #e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#b0b5bd;z-index:9999;">
  <a href="${base}/tool/${esc(toolId)}" style="color:#b0b5bd;text-decoration:none;" title="${esc(toolTitle)}">Powered by <span style="color:#c2724f;font-weight:500;">The ForkHub</span></a>
</div>`
}

function page(
  body: string,
  head: string,
  toolId: string,
  toolTitle: string,
  cacheControl: string,
): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(toolTitle)}</title>
${head}
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{height:100%;margin:0;padding:0;overflow:hidden;background:#fff}
.lv{position:fixed;top:0;left:0;right:0;bottom:30px;overflow:auto}
</style>
</head>
<body>
<div class="lv">${body}</div>
${footerHtml(toolId, toolTitle)}
</body></html>`
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": cacheControl, ...SEC },
  })
}

function notFoundPage(): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html><head><title>Not Found</title></head><body style="font-family:sans-serif;padding:40px;color:#333"><h2>404 — Tool not found</h2><p>This tool does not exist or is not available.</p></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", ...SEC } },
  )
}

// ─── Preview kind ─────────────────────────────────────────────────────────────
function previewKind(mime: string, name: string): string {
  const n = name.toLowerCase(), m = mime ?? ""
  if (m === "text/html"     || n.endsWith(".html") || n.endsWith(".htm"))      return "html"
  if (m === "text/markdown" || n.endsWith(".md")   || n.endsWith(".markdown")) return "markdown"
  if (m === "text/csv"      || n.endsWith(".csv"))                              return "csv"
  if (n.endsWith(".tsv"))                                                        return "tsv"
  if (m === "application/pdf" || n.endsWith(".pdf"))                            return "pdf"
  if (n.endsWith(".xlsx") || n.endsWith(".xls") ||
      m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      m === "application/vnd.ms-excel")                                          return "excel"
  if (n.endsWith(".zip") || m === "application/zip" || m === "application/x-zip-compressed") return "zip"
  if (n.endsWith(".docx") || m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx"
  if (n.endsWith(".ipynb"))                                                      return "ipynb"
  const codeExts = [".py",".js",".ts",".tsx",".jsx",".json",".yaml",".yml",".sql",".sh",".bash",".rb",".go",".rs",".gs"]
  if (codeExts.some((e) => n.endsWith(e)))                                      return "code"
  const codeMimes = ["application/json","text/javascript","application/javascript","text/x-python","text/plain"]
  if (codeMimes.includes(m))                                                     return "code"
  return "other"
}

function codeLang(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "gs")              return "javascript"
  if (ext === "sh"||ext==="bash") return "bash"
  if (ext === "yml"||ext==="yaml") return "yaml"
  if (ext === "py")              return "python"
  if (ext === "ts"||ext==="tsx") return "typescript"
  if (ext === "js"||ext==="jsx") return "javascript"
  if (ext === "sql")             return "sql"
  if (ext === "json")            return "json"
  return "plaintext"
}

// ─── Per-kind renderers ────────────────────────────────────────────────────────

function renderHtml(content: string): { head: string; body: string } {
  const escaped = content.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
  return {
    head: "",
    body: `<iframe srcdoc="${escaped}" style="width:100%;height:100%;border:none;display:block;" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Tool preview"></iframe>`,
  }
}

async function renderCode(content: string, fileName: string): Promise<{ head: string; body: string }> {
  const lang = codeLang(fileName)
  let highlighted: string
  try {
    const hljs = (await import("highlight.js")).default
    highlighted = hljs.highlight(content, { language: lang, ignoreIllegals: true }).value
  } catch {
    highlighted = esc(content)
  }
  const head = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github.min.css" crossorigin="anonymous">`
  const body = `<div style="background:#fff;min-height:100%">
<div style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-family:system-ui,sans-serif;font-size:12px;color:#6b7280;display:flex;gap:8px;align-items:center;">
  <span style="font-weight:600;color:#374151;">${esc(fileName)}</span>
  <span style="background:#f3f4f6;padding:2px 8px;border-radius:99px;">${esc(lang)}</span>
</div>
<pre style="margin:0;padding:20px 24px;font-family:'SF Mono','Monaco','Cascadia Mono','Fira Code',monospace;font-size:13px;line-height:1.65;overflow:auto"><code class="hljs language-${esc(lang)}">${highlighted}</code></pre>
</div>`
  return { head, body }
}

async function renderMarkdown(content: string): Promise<{ head: string; body: string }> {
  let html: string
  try {
    const { marked } = await import("marked")
    html = await marked(content) as string
  } catch {
    html = `<pre>${esc(content)}</pre>`
  }
  const head = ""
  const body = `<div style="max-width:780px;margin:0 auto;padding:40px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.75;color:#1c1917;">
<style>
h1,h2,h3,h4{margin:1.5em 0 0.5em;font-weight:600;line-height:1.3;color:#111}
h1{font-size:2em;margin-top:0}h2{font-size:1.5em}h3{font-size:1.25em}
p{margin:0 0 1em}ul,ol{margin:0 0 1em;padding-left:1.5em}li{margin-bottom:0.25em}
code{background:#f3f4f6;padding:2px 5px;border-radius:4px;font-family:monospace;font-size:0.9em}
pre{background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;overflow:auto;margin:0 0 1em}
pre code{background:none;padding:0}
blockquote{border-left:3px solid #d1d5db;margin:0 0 1em;padding:4px 0 4px 16px;color:#6b7280}
a{color:#c2724f}hr{border:none;border-top:1px solid #e5e7eb;margin:1.5em 0}
table{border-collapse:collapse;width:100%;margin-bottom:1em}
th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left}th{background:#f9fafb}
</style>
${html}</div>`
  return { head, body }
}

function renderCsv(content: string, sep: string): { head: string; body: string } {
  // Minimal RFC-4180 parser: handles quoted fields
  function parseRow(line: string): string[] {
    const cells: string[] = []
    let cur = "", inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (c === sep && !inQ) {
        cells.push(cur); cur = ""
      } else cur += c
    }
    cells.push(cur)
    return cells
  }
  const MAX_ROWS = 500
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  const rows = lines.slice(0, MAX_ROWS + 1).map((l) => parseRow(l))
  const truncated = lines.length > MAX_ROWS + 1

  const [headers, ...body] = rows
  const thHtml = (headers ?? []).map((h) => `<th>${esc(h)}</th>`).join("")
  const tbHtml = body.map((row) =>
    `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`
  ).join("\n")

  const html = `<div style="padding:0;background:#fff">
<style>
.csv-wrap{overflow:auto;max-height:calc(100vh - 72px)}
table{border-collapse:collapse;width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px}
th{background:#f9fafb;border:1px solid #e5e7eb;padding:8px 12px;text-align:left;font-weight:600;color:#374151;white-space:nowrap;position:sticky;top:0}
td{border:1px solid #e5e7eb;padding:7px 12px;color:#1c1917;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:nth-child(even) td{background:#fafafa}
.meta{padding:10px 16px;border-bottom:1px solid #e5e7eb;font-family:system-ui,sans-serif;font-size:12px;color:#6b7280;display:flex;gap:12px}
</style>
<div class="meta">
  <span>${esc(String(body.length))} rows · ${esc(String((headers ?? []).length))} columns${truncated ? ` · showing first ${MAX_ROWS}` : ""}</span>
</div>
<div class="csv-wrap"><table>
<thead><tr>${thHtml}</tr></thead>
<tbody>${tbHtml}</tbody>
</table></div></div>`
  return { head: "", body: html }
}

function renderPdf(buffer: Buffer): { head: string; body: string } {
  const b64 = buffer.toString("base64")
  const body = `<iframe src="data:application/pdf;base64,${b64}" style="width:100%;height:100%;border:none;display:block;" title="PDF preview"></iframe>`
  return { head: "", body }
}

async function renderExcel(buffer: Buffer, previewData?: { type: "excel"; rows: (string | number | boolean | null)[][] } | null): Promise<{ head: string; body: string }> {
  let rows: (string | number | boolean | null)[][] = []
  if (previewData?.type === "excel") {
    rows = previewData.rows
  } else {
    try {
      const XLSX = await import("xlsx")
      const wb  = XLSX.read(buffer, { type: "buffer" })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      rows = (XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, { header: 1, defval: null }) as (string | number | boolean | null)[][])
        .slice(0, 100).map((r) => r.slice(0, 20))
    } catch { rows = [] }
  }
  const [headers, ...body] = rows
  const thHtml = (headers ?? []).map((h) => `<th>${esc(String(h ?? ""))}</th>`).join("")
  const tbHtml = body.map((row) =>
    `<tr>${(row ?? []).map((c) => `<td>${esc(String(c ?? ""))}</td>`).join("")}</tr>`
  ).join("\n")
  const html = `<div style="padding:0;background:#fff">
<style>
.xl-wrap{overflow:auto;max-height:calc(100vh - 72px)}
table{border-collapse:collapse;width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px}
th{background:#f0fdf4;border:1px solid #d1fae5;padding:8px 12px;text-align:left;font-weight:600;color:#065f46;white-space:nowrap;position:sticky;top:0}
td{border:1px solid #e5e7eb;padding:7px 12px;color:#1c1917;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:nth-child(even) td{background:#fafafa}
.meta{padding:10px 16px;border-bottom:1px solid #e5e7eb;font-family:system-ui,sans-serif;font-size:12px;color:#6b7280}
</style>
<div class="meta">${esc(String(body.length))} rows · ${esc(String((headers ?? []).length))} columns</div>
<div class="xl-wrap"><table>
<thead><tr>${thHtml}</tr></thead>
<tbody>${tbHtml}</tbody>
</table></div></div>`
  return { head: "", body: html }
}

async function renderZip(buffer: Buffer, previewData?: { type: "zip"; entries: { path: string; size: number; isDir: boolean }[] } | null): Promise<{ head: string; body: string }> {
  let entries: { path: string; size: number; isDir: boolean }[] = []
  if (previewData?.type === "zip") {
    entries = previewData.entries
  } else {
    try {
      const AdmZip = (await import("adm-zip")).default
      const zip   = new AdmZip(buffer)
      entries = zip.getEntries().map((e) => ({ path: e.entryName, size: e.header.size, isDir: e.isDirectory }))
    } catch { entries = [] }
  }
  function fmtBytes(b: number) {
    if (b === 0) return "—"
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }
  const rows = entries.map((e) => {
    const depth = (e.path.match(/\//g) ?? []).length - (e.isDir ? 1 : 0)
    const pad = depth * 16
    const icon = e.isDir ? "📁" : "📄"
    const name = e.path.split("/").filter(Boolean).pop() ?? e.path
    return `<tr>
      <td style="padding-left:${pad + 12}px">${icon} ${esc(name)}</td>
      <td style="color:#6b7280;text-align:right">${e.isDir ? "" : fmtBytes(e.size)}</td>
    </tr>`
  }).join("\n")
  const html = `<div style="padding:0;background:#fff">
<style>
.zip-wrap{overflow:auto;max-height:calc(100vh - 72px)}
table{border-collapse:collapse;width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px}
th{background:#f8f6f3;border-bottom:2px solid #e5e7eb;padding:8px 12px;text-align:left;font-weight:600;color:#374151;position:sticky;top:0}
td{border-bottom:1px solid #f3f4f6;padding:7px 12px;color:#1c1917}
tr:hover td{background:#fafafa}
.meta{padding:10px 16px;border-bottom:1px solid #e5e7eb;font-family:system-ui,sans-serif;font-size:12px;color:#6b7280}
</style>
<div class="meta">${esc(String(entries.length))} entries</div>
<div class="zip-wrap"><table>
<thead><tr><th>Path</th><th style="text-align:right">Size</th></tr></thead>
<tbody>${rows}</tbody>
</table></div></div>`
  return { head: "", body: html }
}

async function renderDocx(buffer: Buffer, previewData?: { type: "docx"; html: string } | null): Promise<{ head: string; body: string }> {
  let html = ""
  if (previewData?.type === "docx") {
    html = previewData.html
  } else {
    try {
      const mammoth = await import("mammoth")
      html = (await mammoth.convertToHtml({ buffer })).value
    } catch { html = "<p>Could not render document.</p>" }
  }
  const body = `<div style="max-width:780px;margin:0 auto;padding:40px 32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#1c1917;">
<style>
p{margin:0 0 1em}h1,h2,h3{font-weight:700;margin:1.5em 0 0.5em;line-height:1.3}
table{border-collapse:collapse;width:100%;margin-bottom:1em}
td,th{border:1px solid #e5e7eb;padding:6px 10px}th{background:#f9fafb}
</style>
${html}</div>`
  return { head: "", body }
}

async function renderIpynb(buffer: Buffer, previewData?: { type: "ipynb"; cells: { kind: "code" | "markdown"; source: string }[] } | null): Promise<{ head: string; body: string }> {
  let cells: { kind: "code" | "markdown"; source: string }[] = []
  if (previewData?.type === "ipynb") {
    cells = previewData.cells
  } else {
    try {
      type NbCell = { cell_type: string; source: string | string[] }
      const nb = JSON.parse(buffer.toString("utf-8"))
      for (const c of (nb.cells ?? []) as NbCell[]) {
        if (c.cell_type === "code" || c.cell_type === "markdown") {
          const src = Array.isArray(c.source) ? c.source.join("") : (c.source ?? "")
          cells.push({ kind: c.cell_type as "code" | "markdown", source: src })
        }
      }
    } catch { cells = [] }
  }
  const { marked } = await import("marked").catch(() => ({ marked: null }))
  const cellsHtml = await Promise.all(cells.map(async (c) => {
    if (c.kind === "markdown" && marked) {
      const html = await marked(c.source) as string
      return `<div class="nb-md">${html}</div>`
    }
    let highlighted = esc(c.source)
    try {
      const hljs = (await import("highlight.js")).default
      highlighted = hljs.highlight(c.source, { language: "python", ignoreIllegals: true }).value
    } catch { /* use escaped */ }
    return `<div class="nb-code"><pre><code class="hljs language-python">${highlighted}</code></pre></div>`
  }))
  const head = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github.min.css" crossorigin="anonymous">`
  const body = `<div style="max-width:900px;margin:0 auto;padding:24px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<style>
.nb-md{padding:12px 16px;line-height:1.7;font-size:14px;color:#1c1917}
.nb-md p{margin:0 0 0.75em}
.nb-code{margin:8px 0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;background:#f8f9fa}
.nb-code pre{margin:0;padding:14px 16px;font-size:12.5px;line-height:1.6;overflow:auto}
.nb-code pre code{background:none;padding:0}
</style>
${cellsHtml.join("\n")}</div>`
  return { head, body }
}

function renderOther(toolId: string): { head: string; body: string } {
  const base = process.env.NEXTAUTH_URL ?? ""
  return {
    head: "",
    body: `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="text-align:center;padding:48px 32px;max-width:420px;">
  <div style="font-size:40px;margin-bottom:16px">📎</div>
  <p style="font-size:16px;font-weight:600;color:#1c1917;margin:0 0 8px">This file can&apos;t be viewed in the browser.</p>
  <p style="font-size:14px;color:#78716c;margin:0 0 24px;line-height:1.6">Visit The ForkHub to access this tool.</p>
  <a href="${base}/tool/${esc(toolId)}" style="display:inline-block;background:#c2724f;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:500;">View on The ForkHub</a>
</div></div>`,
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  if (isRateLimited(ip)) {
    return new NextResponse("Too Many Requests", { status: 429, headers: { "Retry-After": "60" } })
  }

  const { data: tool, error } = await supabaseServer
    .from("tools")
    .select("id, org_id, title, status, sharing, file_name, file_type, file_url, preview_data")
    .eq("id", params.id)
    .single()

  if (error || !tool) return notFoundPage()
  if (tool.status !== "approved") return notFoundPage()

  const sharing = tool.sharing ?? "private"
  if (sharing === "private") {
    const auth = await getAuth(request)
    if (!auth || auth.user.orgId !== tool.org_id) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=/live/${params.id}`, request.url), 302)
    }
  }

  const cacheControl = sharing === "private" ? "private, no-store" : "public, max-age=60"
  const fileName = tool.file_name ?? ""
  const mimeType = tool.file_type ?? ""
  const title    = tool.title ?? "Tool Preview"
  const kind     = previewKind(mimeType, fileName)

  // Extract storage path from file_url
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  let storagePath: string | null = null
  if (supabaseOrigin && tool.file_url?.startsWith(supabaseOrigin)) {
    const urlPath = new URL(tool.file_url).pathname
    const match   = urlPath.match(/^\/storage\/v1\/object\/(?:public\/)?tool-files\/(.+)$/)
    if (match) storagePath = match[1]
  }

  // "other" doesn't need file download
  if (kind === "other") {
    const { head, body } = renderOther(params.id)
    return page(body, head, params.id, title, cacheControl)
  }

  if (!storagePath) return notFoundPage()

  const { data: blob, error: storageError } = await supabaseServer.storage
    .from("tool-files")
    .download(storagePath)

  if (storageError || !blob) return notFoundPage()

  const buffer  = Buffer.from(await blob.arrayBuffer())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pd      = (tool.preview_data as any) ?? null

  let result: { head: string; body: string }

  switch (kind) {
    case "html":
      result = renderHtml(buffer.toString("utf-8"))
      break
    case "markdown":
      result = await renderMarkdown(buffer.toString("utf-8"))
      break
    case "csv":
      result = renderCsv(buffer.toString("utf-8"), ",")
      break
    case "tsv":
      result = renderCsv(buffer.toString("utf-8"), "\t")
      break
    case "pdf":
      result = renderPdf(buffer)
      break
    case "code":
      result = await renderCode(buffer.toString("utf-8"), fileName)
      break
    case "excel":
      result = await renderExcel(buffer, pd?.type === "excel" ? pd : null)
      break
    case "zip":
      result = await renderZip(buffer, pd?.type === "zip" ? pd : null)
      break
    case "docx":
      result = await renderDocx(buffer, pd?.type === "docx" ? pd : null)
      break
    case "ipynb":
      result = await renderIpynb(buffer, pd?.type === "ipynb" ? pd : null)
      break
    default:
      result = renderOther(params.id)
  }

  return page(result.body, result.head, params.id, title, cacheControl)
}

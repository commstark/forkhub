"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { marked } from "marked"
import hljs from "highlight.js/lib/core"
import javascript from "highlight.js/lib/languages/javascript"
import typescript from "highlight.js/lib/languages/typescript"
import python from "highlight.js/lib/languages/python"
import sql from "highlight.js/lib/languages/sql"
import json from "highlight.js/lib/languages/json"
import yaml from "highlight.js/lib/languages/yaml"
import bash from "highlight.js/lib/languages/bash"
import "highlight.js/styles/github.css"

hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("js", javascript)
hljs.registerLanguage("typescript", typescript)
hljs.registerLanguage("ts", typescript)
hljs.registerLanguage("tsx", typescript)
hljs.registerLanguage("jsx", javascript)
hljs.registerLanguage("python", python)
hljs.registerLanguage("py", python)
hljs.registerLanguage("sql", sql)
hljs.registerLanguage("json", json)
hljs.registerLanguage("yaml", yaml)
hljs.registerLanguage("yml", yaml)
hljs.registerLanguage("bash", bash)
hljs.registerLanguage("sh", bash)

type Creator = { name: string; avatar_url: string | null }

type ExcelPreviewData  = { type: "excel";  rows: (string | number | boolean | null)[][] }
type ZipPreviewData    = { type: "zip";    entries: { path: string; size: number; isDir: boolean }[] }
type DocxPreviewData   = { type: "docx";   html: string }
type IpynbPreviewData  = { type: "ipynb";  cells: { kind: "code" | "markdown"; source: string }[] }
type PreviewData = ExcelPreviewData | ZipPreviewData | DocxPreviewData | IpynbPreviewData

type Tool = {
  id: string
  title: string
  description: string
  category: string
  classification: string
  status: string
  sharing: string
  file_url: string
  file_type: string
  file_name: string
  file_size: number
  version_number: number
  fork_count: number
  rating_avg: number
  rating_count: number
  parent_tool_id: string | null
  created_at: string
  creator_id: string
  creator: Creator | null
  preview_data: PreviewData | null
}

type Rating = {
  id: string
  score: number
  comment: string | null
  created_at: string
  user: { name: string; avatar_url: string | null } | null
}

type Fork = {
  id: string
  title: string
  version_number: number
  status: string
  created_at: string
  creator: { name: string } | null
}

type LineageNode = {
  id: string
  title: string
  version_number: number
  creator: { name: string } | null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function classificationClass(c: string) {
  if (c === "internal_noncustomer") return "badge-nc"
  if (c === "internal_customer")    return "badge-ic"
  if (c === "external_customer")    return "badge-ec"
  return "badge-neutral"
}

function getPreviewKind(fileType: string, fileName: string, previewData: PreviewData | null) {
  const name = fileName.toLowerCase()
  const mt   = fileType ?? ""

  if (mt === "text/html"     || name.endsWith(".html") || name.endsWith(".htm"))       return "html"
  if (mt === "text/markdown" || name.endsWith(".md")   || name.endsWith(".markdown"))  return "markdown"
  if (mt === "text/csv"      || name.endsWith(".csv"))                                  return "csv"
  if (name.endsWith(".tsv"))                                                             return "tsv"
  if (mt.startsWith("image/"))                                                           return "image"
  if (mt === "application/pdf" || name.endsWith(".pdf"))                               return "pdf"

  // Structured preview_data types
  if (previewData?.type === "excel") return "excel"
  if (previewData?.type === "zip")   return "zip"
  if (previewData?.type === "docx")  return "docx"
  if (previewData?.type === "ipynb") return "ipynb"

  // Fallback by extension for these types even without preview_data
  if (name.endsWith(".xlsx") || name.endsWith(".xls") ||
      mt === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mt === "application/vnd.ms-excel") return "excel"
  if (name.endsWith(".zip") || mt === "application/zip") return "zip"
  if (name.endsWith(".docx") || mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx"
  if (name.endsWith(".ipynb")) return "ipynb"

  const codeExts = [".py", ".js", ".ts", ".tsx", ".jsx", ".json",
                    ".yaml", ".yml", ".sql", ".sh", ".bash", ".rb",
                    ".go", ".rs", ".gs"]
  if (codeExts.some((ext) => name.endsWith(ext))) return "code"
  const codeMimes = ["application/json", "text/javascript", "application/javascript",
                     "text/x-python", "text/plain"]
  if (codeMimes.includes(mt)) return "code"

  return "other"
}

function Stars({ score }: { score: number }) {
  return (
    <span className="stars">
      {"★".repeat(score)}<span className="stars-empty">{"★".repeat(5 - score)}</span>
    </span>
  )
}

// ─── Preview Components ───────────────────────────────────────────────────────

function HtmlPreview({ toolId, expanded, onToggle }: { toolId: string; expanded: boolean; onToggle: () => void }) {
  return (
    <div style={expanded ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "#fff", padding: 24, margin: 0 } : {}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>
          Live preview
        </span>
        <div
          onClick={onToggle}
          style={{ width: 12, height: 12, borderRadius: "50%", background: "#28CA41", cursor: "pointer", flexShrink: 0 }}
          title={expanded ? "Minimize" : "Expand fullscreen"}
        />
      </div>
      <iframe
        src={`/preview/${toolId}`}
        style={{ width: "100%", height: expanded ? "calc(100vh - 80px)" : 400, border: "none", borderRadius: 8, display: "block", background: "#fafafa" }}
        sandbox="allow-scripts allow-same-origin"
        title="Tool preview"
      />
    </div>
  )
}

function MarkdownPreview({ toolId }: { toolId: string }) {
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    fetch(`/api/tools/${toolId}/file`).then((r) => r.text()).then((text) => setHtml(marked(text) as string))
  }, [toolId])
  if (!html) return <div className="loading-state" style={{ padding: 24 }}>Loading…</div>
  return (
    <div className="card card-pad-lg prose-doc" dangerouslySetInnerHTML={{ __html: html }} />
  )
}

function CsvPreview({ toolId, separator }: { toolId: string; separator: string }) {
  const [rows, setRows] = useState<string[][] | null>(null)
  useEffect(() => {
    fetch(`/api/tools/${toolId}/file`).then((r) => r.text()).then((text) => {
      const lines = text.split("\n").filter(Boolean).slice(0, 101)
      setRows(lines.map((l) => l.split(separator)))
    })
  }, [toolId, separator])
  if (!rows) return <div className="loading-state" style={{ padding: 24 }}>Loading…</div>
  const headers = rows[0]
  const body    = rows.slice(1, 101)
  return (
    <div className="table-wrap" style={{ maxHeight: 384, overflow: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {body.length >= 100 && (
        <p style={{ fontSize: 12, color: "var(--text-3)", padding: "8px 16px", textAlign: "center" }}>Showing first 100 rows</p>
      )}
    </div>
  )
}

function getCodeLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "gs")                       return "javascript"
  if (ext === "sh" || ext === "bash")     return "bash"
  if (ext === "yml" || ext === "yaml")    return "yaml"
  if (ext === "py")                       return "python"
  if (ext === "ts" || ext === "tsx")      return "typescript"
  if (ext === "js" || ext === "jsx")      return "javascript"
  if (ext === "sql")                      return "sql"
  if (ext === "json")                     return "json"
  return ext || "plaintext"
}

function CodePreview({ toolId, fileName }: { toolId: string; fileName: string }) {
  const [code, setCode] = useState<string | null>(null)
  const codeRef = useRef<HTMLElement>(null)
  useEffect(() => { fetch(`/api/tools/${toolId}/file`).then((r) => r.text()).then(setCode) }, [toolId])
  useEffect(() => { if (code && codeRef.current) hljs.highlightElement(codeRef.current) }, [code])
  const lang = getCodeLanguage(fileName)
  if (!code) return <div className="loading-state" style={{ padding: 24 }}>Loading…</div>
  return (
    <div className="table-wrap" style={{ overflow: "auto", maxHeight: 400 }}>
      <pre style={{ margin: 0 }}><code ref={codeRef} className={`language-${lang}`}>{code}</code></pre>
    </div>
  )
}

function ImagePreview({ toolId, fileName }: { toolId: string; fileName: string }) {
  return (
    <div className="card card-pad" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 192 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/tools/${toolId}/file`} alt={fileName} style={{ maxHeight: 384, maxWidth: "100%", objectFit: "contain" }} />
    </div>
  )
}

function PdfPreview({ fileUrl }: { fileUrl: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="card card-pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 40 }}>
        <svg style={{ width: 36, height: 36, color: "var(--text-3)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)" }}>PDF preview unavailable in this browser.</p>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: 12 }}>Open PDF</a>
      </div>
    )
  }
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
      <iframe
        src={fileUrl}
        width="100%"
        height="600"
        style={{ display: "block", border: "none" }}
        onError={() => setFailed(true)}
        title="PDF preview"
      />
    </div>
  )
}

function ExcelPreview({ data }: { data: ExcelPreviewData | null }) {
  if (!data || data.rows.length === 0) {
    return <div className="loading-state" style={{ padding: 24 }}>No data to preview.</div>
  }
  const headers = data.rows[0]
  const body    = data.rows.slice(1)
  return (
    <div className="table-wrap" style={{ maxHeight: 400, overflow: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{h ?? ""}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j}>{cell ?? ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {data.rows.length >= 100 && (
        <p style={{ fontSize: 12, color: "var(--text-3)", padding: "8px 16px", textAlign: "center" }}>Showing first 100 rows</p>
      )}
    </div>
  )
}

function ZipPreview({ data }: { data: ZipPreviewData | null }) {
  if (!data || data.entries.length === 0) {
    return <div className="loading-state" style={{ padding: 24 }}>Empty archive.</div>
  }
  return (
    <div className="table-wrap" style={{ maxHeight: 400, overflow: "auto", padding: "8px 0" }}>
      {data.entries.map((entry, i) => {
        const depth  = entry.path.split("/").filter(Boolean).length - 1
        const name   = entry.path.split("/").filter(Boolean).pop() ?? entry.path
        const indent = depth * 16
        return (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 16px",
              paddingLeft: 16 + indent,
              fontSize: 13,
              color: entry.isDir ? "var(--text-2)" : "var(--text-1)",
            }}
          >
            {entry.isDir ? (
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, color: "var(--text-3)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            ) : (
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, color: "var(--text-3)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span style={{ flex: 1, fontFamily: entry.isDir ? undefined : "var(--font-mono)", fontSize: 12 }}>{name}</span>
            {!entry.isDir && entry.size > 0 && (
              <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>{formatBytes(entry.size)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DocxPreview({ data }: { data: DocxPreviewData | null }) {
  if (!data?.html) return <div className="loading-state" style={{ padding: 24 }}>No content to preview.</div>
  return (
    <div
      className="card card-pad-lg prose-doc"
      style={{ maxHeight: 500, overflow: "auto" }}
      dangerouslySetInnerHTML={{ __html: data.html }}
    />
  )
}

function IpynbPreview({ data }: { data: IpynbPreviewData | null }) {
  const codeRef = useRef<HTMLElement[]>([])

  useEffect(() => {
    codeRef.current.forEach((el) => { if (el) hljs.highlightElement(el) })
  }, [data])

  if (!data || data.cells.length === 0) return <div className="loading-state" style={{ padding: 24 }}>Empty notebook.</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {data.cells.map((cell, i) => (
        <div key={i} style={{ borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
          <div style={{ padding: "2px 10px", background: "var(--bg)", borderBottom: "1px solid var(--border)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)" }}>
            {cell.kind === "code" ? "In" : "Markdown"}
          </div>
          {cell.kind === "code" ? (
            <div style={{ overflow: "auto", maxHeight: 300 }}>
              <pre style={{ margin: 0, padding: "10px 14px", fontSize: 12 }}>
                <code
                  ref={(el) => { if (el) codeRef.current[i] = el }}
                  className="language-python"
                >
                  {cell.source}
                </code>
              </pre>
            </div>
          ) : (
            <div
              className="prose-doc"
              style={{ padding: "10px 14px", fontSize: 13 }}
              dangerouslySetInnerHTML={{ __html: marked(cell.source) as string }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function OtherPreview({ fileName, fileSize, fileType, createdAt }: { fileName: string; fileSize: number; fileType: string; createdAt: string }) {
  const ext = fileName.split(".").pop()?.toUpperCase() ?? "FILE"
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
      {/* File type badge */}
      <div style={{ width: 56, height: 56, borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--text-3)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-1)", margin: "0 0 4px", fontFamily: "var(--font-mono)" }}>.{ext.toLowerCase()}</p>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 2px" }}>{fileName}</p>
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
          {fileType || "Binary file"} · {formatBytes(fileSize)} · Uploaded {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
        No preview available for this file type. Download to view.
      </p>
    </div>
  )
}

function Preview({ tool, expanded, onToggle }: { tool: Tool; expanded: boolean; onToggle: () => void }) {
  const kind = getPreviewKind(tool.file_type, tool.file_name, tool.preview_data)
  switch (kind) {
    case "html":     return <HtmlPreview toolId={tool.id} expanded={expanded} onToggle={onToggle} />
    case "markdown": return <MarkdownPreview toolId={tool.id} />
    case "csv":      return <CsvPreview toolId={tool.id} separator="," />
    case "tsv":      return <CsvPreview toolId={tool.id} separator="\t" />
    case "image":    return <ImagePreview toolId={tool.id} fileName={tool.file_name} />
    case "code":     return <CodePreview toolId={tool.id} fileName={tool.file_name} />
    case "pdf":      return <PdfPreview fileUrl={tool.file_url} />
    case "excel":    return <ExcelPreview data={tool.preview_data?.type === "excel" ? tool.preview_data : null} />
    case "zip":      return <ZipPreview data={tool.preview_data?.type === "zip" ? tool.preview_data : null} />
    case "docx":     return <DocxPreview data={tool.preview_data?.type === "docx" ? tool.preview_data : null} />
    case "ipynb":    return <IpynbPreview data={tool.preview_data?.type === "ipynb" ? tool.preview_data : null} />
    default:         return <OtherPreview fileName={tool.file_name} fileSize={tool.file_size} fileType={tool.file_type} createdAt={tool.created_at} />
  }
}

// ─── Sharing Badge ────────────────────────────────────────────────────────────

function SharingBadge({ sharing }: { sharing: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    private: { label: "Private",          color: "#78716c", bg: "rgba(120,113,108,0.1)" },
    link:    { label: "Shared via link",  color: "#c2724f", bg: "rgba(194,114,79,0.1)"  },
    public:  { label: "Public",           color: "#4d7c4d", bg: "rgba(77,124,77,0.1)"   },
  }
  const s = map[sharing] ?? map.private
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 500,
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}30`,
      borderRadius: 6, padding: "2px 8px",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

// ─── Live URL Section ─────────────────────────────────────────────────────────

function LiveUrlSection({
  tool,
  isOwner,
}: {
  tool: Tool
  isOwner: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const liveUrl = `${origin}/live/${tool.id}`
  const sharing = tool.sharing ?? "private"
  const isApproved = tool.status === "approved"
  const isShareable = sharing === "link" || sharing === "public"

  function copyUrl() {
    navigator.clipboard.writeText(liveUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (!isApproved) return null

  return (
    <section className="page-section">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <p className="section-title" style={{ margin: 0 }}>Live URL</p>
        <SharingBadge sharing={sharing} />
      </div>

      {isShareable ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-card)",
          borderRadius: "var(--r-input)",
          padding: "8px 12px",
        }}>
          <span style={{
            flex: 1, fontSize: 13, fontFamily: "var(--font-mono)",
            color: "var(--text-secondary)", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {liveUrl}
          </span>
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12, color: "var(--accent)", textDecoration: "none",
              fontWeight: 500, flexShrink: 0,
              padding: "3px 8px", border: "1px solid var(--accent)30",
              borderRadius: 5, background: "var(--accent-dim)",
            }}
          >
            Open
          </a>
          <button
            onClick={copyUrl}
            style={{
              background: copied ? "var(--status-approved-bg)" : "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: 5, cursor: "pointer",
              padding: "3px 10px", fontSize: 12,
              fontFamily: "var(--font-sans)",
              color: copied ? "var(--status-approved)" : "var(--text-secondary)",
              fontWeight: 500, flexShrink: 0,
              transition: "all 150ms ease",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Set sharing to <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>link</code> to get a shareable URL anyone can access.
          {isOwner && (
            <span style={{ color: "var(--text-muted)", display: "block", marginTop: 6, fontSize: 12, fontFamily: "var(--font-mono)" }}>
              {`POST /api/tools/${tool.id}/sharing  {"mode": "link"}`}
            </span>
          )}
        </p>
      )}

      {isOwner && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0", fontFamily: "var(--font-mono)" }}>
          {`Change: POST /api/tools/${tool.id}/sharing  {"mode": "private|link|public"}`}
        </p>
      )}
    </section>
  )
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ tool }: { tool: Tool }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(`The Fork Hub tool: ${tool.title} (ID: ${tool.id})`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="relative" style={{ display: "inline-flex", alignItems: "center" }}>
      <button onClick={handleCopy} className="copy-btn" title="Copy tool reference">
        {copied ? (
          <svg width="15" height="15" fill="none" stroke="var(--success)" viewBox="0 0 24 24" style={{ transition: "opacity 150ms ease" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
      {copied && <span className="copy-tooltip">Copied!</span>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ToolDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const [tool, setTool]                     = useState<Tool | null>(null)
  const [ratings, setRatings]               = useState<Rating[]>([])
  const [forks, setForks]                   = useState<Fork[]>([])
  const [lineage, setLineage]               = useState<LineageNode[]>([])
  const [loading, setLoading]               = useState(true)
  const [notFound, setNotFound]             = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      const toolRes = await fetch(`/api/tools/${params.id}`)
      if (!toolRes.ok) { setNotFound(true); setLoading(false); return }
      const toolData: Tool = await toolRes.json()
      setTool(toolData)
      const [ratingsData, forksData, lineageData] = await Promise.all([
        fetch(`/api/tools/${params.id}/ratings`).then((r) => r.json()),
        fetch(`/api/tools/${params.id}/forks`).then((r) => r.json()),
        fetch(`/api/tools/${params.id}/lineage`).then((r) => r.json()),
      ])
      setRatings(Array.isArray(ratingsData) ? ratingsData : [])
      setForks(Array.isArray(forksData) ? forksData : [])
      setLineage(Array.isArray(lineageData) ? lineageData : [])
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading)            return <div className="loading-state">Loading…</div>
  if (notFound || !tool)  return <div className="loading-state">Tool not found.</div>

  const isOwner =
    session?.user?.id === tool.creator_id || session?.user?.role === "admin"

  return (
    <main className="page-narrow">

      <Link href="/" className="back-link">← Browse</Link>

      {/* Header */}
      <section className="page-section">
        <div className="flex items-start gap-2 mb-2">
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-1)", letterSpacing: "-0.02em", margin: 0, flex: 1 }}>
            {tool.title}
          </h1>
          <span className="ver-pill" style={{ marginTop: 4 }}>V{tool.version_number ?? 1}</span>
          <CopyButton tool={tool} />
        </div>

        <div className="flex items-center gap-2 mb-3" style={{ flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
            by{" "}
            <Link href={`/profile/${tool.creator_id}`} style={{ color: "var(--text-1)", textDecoration: "none" }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline" }}
              onMouseOut={(e)  => { (e.currentTarget as HTMLElement).style.textDecoration = "none" }}
            >
              {tool.creator?.name ?? "Unknown"}
            </Link>
          </span>
          <span className={`badge ${classificationClass(tool.classification)}`}>
            {tool.classification.replace(/_/g, " ")}
          </span>
          {tool.category  && <span className="tag">{tool.category}</span>}
          {tool.file_type && <span className="tag tag-mono">{tool.file_type}</span>}
          <SharingBadge sharing={tool.sharing ?? "private"} />
        </div>

        <div className="flex items-center gap-3" style={{ fontSize: 13, color: "var(--text-2)", flexWrap: "wrap" }}>
          {tool.rating_count > 0 ? (
            <span className="flex items-center gap-1">
              <Stars score={Math.round(tool.rating_avg)} />
              <span style={{ marginLeft: 4 }}>{Number(tool.rating_avg).toFixed(1)}</span>
              <span style={{ color: "var(--text-3)" }}>({tool.rating_count} {tool.rating_count === 1 ? "rating" : "ratings"})</span>
            </span>
          ) : (
            <span style={{ color: "var(--text-3)" }}>No ratings yet</span>
          )}
          <span style={{ color: "var(--border-hover)" }}>·</span>
          <span>{new Date(tool.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
          {tool.fork_count > 0 && (
            <>
              <span style={{ color: "var(--border-hover)" }}>·</span>
              <span>⑂ {tool.fork_count} {tool.fork_count === 1 ? "fork" : "forks"}</span>
            </>
          )}
        </div>

        {tool.description && (
          <p style={{ marginTop: 14, fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>{tool.description}</p>
        )}
      </section>

      {/* Preview */}
      <section className="page-section">
        <p className="section-title">Preview</p>
        <Preview tool={tool} expanded={previewExpanded} onToggle={() => setPreviewExpanded((v) => !v)} />
      </section>

      {/* Live URL */}
      <LiveUrlSection tool={tool} isOwner={isOwner} />

      {/* Lineage */}
      {(lineage.length > 1 || forks.length > 0) && (
        <section className="page-section">
          <p className="section-title">Version Lineage</p>

          {lineage.length > 1 && (
            <div className="lineage">
              {lineage.map((node, i) => {
                const isCurrent = node.id === params.id
                const isRoot    = i === 0
                return (
                  <span key={node.id} className="flex items-center gap-1">
                    {i > 0 && <span className="lineage-arrow">→</span>}
                    {isCurrent ? (
                      <span className="lineage-current">
                        V{node.version_number ?? 1}{isRoot ? " (Original)" : ""}
                        {node.creator && <span style={{ fontWeight: 400, color: "var(--text-2)" }}> by {node.creator.name}</span>}
                      </span>
                    ) : (
                      <Link href={`/tool/${node.id}`} className="lineage-node">
                        V{node.version_number ?? 1}{isRoot ? " (Original)" : ""}
                        {node.creator && <span style={{ color: "var(--text-3)" }}> by {node.creator.name}</span>}
                      </Link>
                    )}
                  </span>
                )
              })}
            </div>
          )}

          {forks.length > 0 && (
            <div className="table-wrap">
              {forks.map((fork) => (
                <div key={fork.id} style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                  <span>
                    <Link href={`/tool/${fork.id}`} style={{ fontWeight: 500, color: "var(--text-1)", textDecoration: "none" }}
                      onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline" }}
                      onMouseOut={(e)  => { (e.currentTarget as HTMLElement).style.textDecoration = "none" }}
                    >
                      {fork.title}
                    </Link>
                    <span style={{ color: "var(--text-3)", marginLeft: 6 }}>V{fork.version_number ?? 1}</span>
                    {fork.creator && <span style={{ color: "var(--text-3)", marginLeft: 6 }}>by {fork.creator.name}</span>}
                  </span>
                  <span style={{ color: "var(--text-3)", fontSize: 12 }}>{new Date(fork.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Ratings */}
      <section className="page-section">
        <p className="section-title">
          Ratings
          {tool.rating_count > 0 && (
            <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-3)", marginLeft: 8 }}>
              {Number(tool.rating_avg).toFixed(1)} avg · {tool.rating_count} {tool.rating_count === 1 ? "rating" : "ratings"}
            </span>
          )}
        </p>
        {ratings.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>No ratings yet.</p>
        ) : (
          <div className="stack">
            {ratings.map((r) => (
              <div key={r.id} className="card card-pad-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Stars score={r.score} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{r.user?.name ?? "Unknown"}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.comment && <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  )
}

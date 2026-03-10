"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
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

// ─── Types ───────────────────────────────────────────────────────────────────

type Creator = { name: string; avatar_url: string | null }

type Tool = {
  id: string
  title: string
  description: string
  category: string
  classification: string
  status: string
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CLASSIFICATION_STYLES: Record<string, string> = {
  internal_noncustomer: "bg-blue-100 text-blue-700",
  internal_customer: "bg-purple-100 text-purple-700",
  external_customer: "bg-orange-100 text-orange-700",
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getPreviewKind(fileType: string, fileName: string) {
  const name = fileName.toLowerCase()
  if (fileType === "text/html" || name.endsWith(".html") || name.endsWith(".htm")) return "html"
  if (fileType === "text/markdown" || name.endsWith(".md") || name.endsWith(".markdown")) return "markdown"
  if (fileType === "text/csv" || name.endsWith(".csv")) return "csv"
  if (name.endsWith(".tsv")) return "tsv"
  if (fileType?.startsWith("image/")) return "image"
  const codeExts = [".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".yaml", ".yml", ".sql", ".sh", ".rb", ".go", ".rs"]
  if (codeExts.some((ext) => name.endsWith(ext))) return "code"
  const codeMimes = ["application/json", "text/javascript", "application/javascript", "text/x-python", "text/plain"]
  if (codeMimes.includes(fileType)) return "code"
  return "other"
}

function Stars({ score }: { score: number }) {
  return (
    <span className="text-yellow-400">
      {"★".repeat(score)}
      <span className="text-gray-200">{"★".repeat(5 - score)}</span>
    </span>
  )
}

// ─── Preview Components ───────────────────────────────────────────────────────

// HTML — ClawStore pattern: outer iframe → /preview/[id] server route → srcdoc inner iframe
// Expand/collapse with green dot toggle
function HtmlPreview({ toolId, expanded, onToggle }: { toolId: string; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      style={expanded ? {
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999, background: "#fff", padding: 24, margin: 0,
      } : {}}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999" }}>
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
        style={{
          width: "100%",
          height: expanded ? "calc(100vh - 80px)" : 400,
          border: "none",
          borderRadius: 8,
          display: "block",
          background: "#fafafa",
        }}
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
  if (!html) return <div className="text-gray-400 text-sm p-4">Loading…</div>
  return (
    <div
      className="prose prose-sm max-w-none border border-gray-200 rounded-lg p-6 bg-white"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function CsvPreview({ toolId, separator }: { toolId: string; separator: string }) {
  const [rows, setRows] = useState<string[][] | null>(null)
  useEffect(() => {
    fetch(`/api/tools/${toolId}/file`)
      .then((r) => r.text())
      .then((text) => {
        const lines = text.split("\n").filter(Boolean).slice(0, 101)
        setRows(lines.map((l) => l.split(separator)))
      })
  }, [toolId, separator])
  if (!rows) return <div className="text-gray-400 text-sm p-4">Loading…</div>
  const headers = rows[0]
  const body = rows.slice(1, 101)
  return (
    <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
      <table className="text-xs w-full">
        <thead className="bg-gray-50 sticky top-0">
          <tr>{headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200">{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              {row.map((cell, j) => <td key={j} className="px-3 py-1.5 text-gray-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {body.length >= 100 && <p className="text-xs text-gray-400 p-2 text-center">Showing first 100 rows</p>}
    </div>
  )
}

function CodePreview({ toolId, fileName }: { toolId: string; fileName: string }) {
  const [code, setCode] = useState<string | null>(null)
  const codeRef = useRef<HTMLElement>(null)
  useEffect(() => {
    fetch(`/api/tools/${toolId}/file`).then((r) => r.text()).then(setCode)
  }, [toolId])
  useEffect(() => {
    if (code && codeRef.current) hljs.highlightElement(codeRef.current)
  }, [code])
  const ext = fileName.split(".").pop() ?? "plaintext"
  if (!code) return <div className="text-gray-400 text-sm p-4">Loading…</div>
  return (
    <div className="border border-gray-200 rounded-lg overflow-auto max-h-96">
      <pre className="m-0"><code ref={codeRef} className={`language-${ext}`}>{code}</code></pre>
    </div>
  )
}

function ImagePreview({ toolId, fileName }: { toolId: string; fileName: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white flex items-center justify-center min-h-48">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/tools/${toolId}/file`} alt={fileName} className="max-h-96 max-w-full object-contain" />
    </div>
  )
}

function OtherPreview({ fileName, fileSize, fileType }: { fileName: string; fileSize: number; fileType: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-8 bg-white flex flex-col items-center gap-3 text-gray-500">
      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="font-medium text-gray-700">{fileName}</p>
      <p className="text-sm">{fileType || "Unknown type"} · {formatBytes(fileSize)}</p>
    </div>
  )
}

function Preview({ tool, expanded, onToggle }: { tool: Tool; expanded: boolean; onToggle: () => void }) {
  const kind = getPreviewKind(tool.file_type, tool.file_name)
  switch (kind) {
    case "html":     return <HtmlPreview toolId={tool.id} expanded={expanded} onToggle={onToggle} />
    case "markdown": return <MarkdownPreview toolId={tool.id} />
    case "csv":      return <CsvPreview toolId={tool.id} separator="," />
    case "tsv":      return <CsvPreview toolId={tool.id} separator="\t" />
    case "image":    return <ImagePreview toolId={tool.id} fileName={tool.file_name} />
    case "code":     return <CodePreview toolId={tool.id} fileName={tool.file_name} />
    default:         return <OtherPreview fileName={tool.file_name} fileSize={tool.file_size} fileType={tool.file_type} />
  }
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ tool }: { tool: Tool }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(`ForkHub tool: ${tool.title} (ID: ${tool.id})`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="relative inline-flex items-center">
      <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 transition p-1 rounded" title="Copy tool reference">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      {copied && (
        <span className="absolute left-7 top-0.5 text-xs bg-gray-800 text-white px-2 py-0.5 rounded whitespace-nowrap animate-fade-out">
          Copied!
        </span>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ToolDetailPage({ params }: { params: { id: string } }) {
  const [tool, setTool] = useState<Tool | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [forks, setForks] = useState<Fork[]>([])
  const [parent, setParent] = useState<Tool | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      const toolRes = await fetch(`/api/tools/${params.id}`)
      if (!toolRes.ok) { setNotFound(true); setLoading(false); return }
      const toolData: Tool = await toolRes.json()
      setTool(toolData)
      const [ratingsData, forksData, parentData] = await Promise.all([
        fetch(`/api/tools/${params.id}/ratings`).then((r) => r.json()),
        fetch(`/api/tools/${params.id}/forks`).then((r) => r.json()),
        toolData.parent_tool_id
          ? fetch(`/api/tools/${toolData.parent_tool_id}`).then((r) => r.ok ? r.json() : null)
          : Promise.resolve(null),
      ])
      setRatings(ratingsData)
      setForks(forksData)
      setParent(parentData)
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>
  if (notFound || !tool) return <div className="p-8 text-gray-500">Tool not found.</div>

  return (
    <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

      <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">← Browse</Link>

      {/* ── Header ── */}
      <section>
        <div className="flex items-start gap-2 mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            {tool.title}{" "}
            <span className="text-gray-400 font-normal text-lg">V{tool.version_number ?? 1}</span>
          </h1>
          <CopyButton tool={tool} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
          <span className="text-gray-500">
            by{" "}
            <Link href={`/profile/${tool.creator_id}`} className="text-gray-700 hover:underline">
              {tool.creator?.name ?? "Unknown"}
            </Link>
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLASSIFICATION_STYLES[tool.classification] ?? "bg-gray-100 text-gray-600"}`}>
            {tool.classification.replace(/_/g, " ")}
          </span>
          {tool.category && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tool.category}</span>
          )}
          {tool.file_type && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{tool.file_type}</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {tool.rating_count > 0 ? (
            <span className="flex items-center gap-1">
              <Stars score={Math.round(tool.rating_avg)} />
              <span className="ml-1">{Number(tool.rating_avg).toFixed(1)}</span>
              <span className="text-gray-400">({tool.rating_count} {tool.rating_count === 1 ? "rating" : "ratings"})</span>
            </span>
          ) : (
            <span className="text-gray-400">No ratings yet</span>
          )}
          <span className="text-gray-300">·</span>
          <span>{new Date(tool.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
        {tool.description && (
          <p className="mt-3 text-gray-600 text-sm leading-relaxed">{tool.description}</p>
        )}
      </section>

      {/* ── Preview ── */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Preview</h2>
        <Preview
          tool={tool}
          expanded={previewExpanded}
          onToggle={() => setPreviewExpanded((v) => !v)}
        />
      </section>

      {/* ── Version chain ── */}
      {(parent || forks.length > 0) && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Version Chain</h2>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
            {parent && (
              <div className="px-4 py-3 text-sm text-gray-600">
                Forked from{" "}
                <Link href={`/tool/${parent.id}`} className="font-medium text-gray-900 hover:underline">
                  {parent.title} V{parent.version_number ?? 1}
                </Link>
                {parent.creator && <span> by {parent.creator.name}</span>}
              </div>
            )}
            {forks.map((fork) => (
              <div key={fork.id} className="px-4 py-3 text-sm flex items-center justify-between">
                <span className="text-gray-600">
                  Forked as{" "}
                  <Link href={`/tool/${fork.id}`} className="font-medium text-gray-900 hover:underline">
                    {fork.title} V{fork.version_number ?? 1}
                  </Link>
                  {fork.creator && <span className="text-gray-400"> by {fork.creator.name}</span>}
                </span>
                <span className="text-xs text-gray-400">{new Date(fork.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Ratings ── */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Ratings{tool.rating_count > 0 && <span className="normal-case font-normal text-gray-400"> — {Number(tool.rating_avg).toFixed(1)} avg from {tool.rating_count}</span>}
        </h2>
        {ratings.length === 0 ? (
          <p className="text-sm text-gray-400">No ratings yet. Rate via POST /api/tools/{tool.id}/rate</p>
        ) : (
          <div className="space-y-3">
            {ratings.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Stars score={r.score} />
                    <span className="text-sm font-medium text-gray-700">{r.user?.name ?? "Unknown"}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  )
}

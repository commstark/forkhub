"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"

const SecurityDoc = dynamic(() => import("@/components/SecurityDoc"), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool = {
  id: string; title: string; description: string; classification: string
  file_type: string; file_name: string; file_size: number; category: string
  version_number: number; created_at: string; org_id: string
  creator: { name: string; avatar_url: string | null } | null
  creator_id: string
}

type Review = {
  id: string; status: string; notes: string | null
  created_at: string; reviewed_at: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  security_doc: Record<string, any> | null
  tool: Tool | null
  reviewer: { name: string; avatar_url: string | null } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:           "bg-yellow-100 text-yellow-800",
  approved:          "bg-green-100 text-green-800",
  rejected:          "bg-red-100 text-red-800",
  changes_requested: "bg-orange-100 text-orange-800",
}

const CLASSIFICATION_STYLES: Record<string, string> = {
  internal_noncustomer: "bg-blue-100 text-blue-700",
  internal_customer:    "bg-purple-100 text-purple-700",
  external_customer:    "bg-orange-100 text-orange-700",
}

// ─── HTML Preview (same ClawStore pattern as tool detail) ─────────────────────

function HtmlPreview({ toolId, expanded, onToggle }: { toolId: string; expanded: boolean; onToggle: () => void }) {
  return (
    <div style={expanded ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "#fff", padding: 24 } : {}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999" }}>Live preview</span>
        <div onClick={onToggle} style={{ width: 12, height: 12, borderRadius: "50%", background: "#28CA41", cursor: "pointer" }} title={expanded ? "Minimize" : "Expand fullscreen"} />
      </div>
      <iframe
        src={`/preview/${toolId}`}
        style={{ width: "100%", height: expanded ? "calc(100vh - 80px)" : 380, border: "none", borderRadius: 8, display: "block", background: "#fafafa" }}
        sandbox="allow-scripts allow-same-origin"
        title="Tool preview"
      />
    </div>
  )
}

function ToolPreview({ tool, expanded, onToggle }: { tool: Tool; expanded: boolean; onToggle: () => void }) {
  const name = tool.file_name.toLowerCase()
  const isHtml = tool.file_type === "text/html" || name.endsWith(".html")
  const isImage = tool.file_type?.startsWith("image/")

  if (isHtml)  return <HtmlPreview toolId={tool.id} expanded={expanded} onToggle={onToggle} />
  if (isImage) return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white flex items-center justify-center min-h-48">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/tools/${tool.id}/file`} alt={tool.file_name} className="max-h-96 max-w-full object-contain" />
    </div>
  )
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-sm text-gray-500 text-center">
      <p className="font-medium text-gray-700 mb-1">{tool.file_name}</p>
      <p className="text-xs text-gray-400">{tool.file_type} · Preview available on tool detail page</p>
      <Link href={`/tool/${tool.id}`} className="text-xs text-gray-500 underline mt-2 inline-block">Open tool detail →</Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewDetailPage({ params }: { params: { id: string } }) {
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/reviews/${params.id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data) => { setReview(data); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [params.id])

  if (loading)           return <div className="p-8 text-gray-400">Loading…</div>
  if (notFound || !review) return <div className="p-8 text-gray-500">Review not found.</div>

  const tool = review.tool

  return (
    <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

      {/* Back */}
      <div className="flex items-center gap-4">
        <Link href="/review" className="text-sm text-gray-400 hover:text-gray-700">← Review queue</Link>
        {tool && <Link href={`/tool/${tool.id}`} className="text-sm text-gray-400 hover:text-gray-700">View tool page →</Link>}
      </div>

      {/* ── Review Header ── */}
      <section>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              {tool?.title ?? "—"}
              {tool && <span className="text-gray-400 font-normal text-lg ml-2">V{tool.version_number ?? 1}</span>}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
              {tool?.creator && (
                <span className="text-gray-500">by <span className="text-gray-700">{tool.creator.name}</span></span>
              )}
              {tool?.classification && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLASSIFICATION_STYLES[tool.classification] ?? "bg-gray-100 text-gray-600"}`}>
                  {tool.classification.replace(/_/g, " ")}
                </span>
              )}
              {tool?.category && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tool.category}</span>
              )}
              {tool?.file_type && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{tool.file_type}</span>
              )}
            </div>
            {tool?.description && <p className="text-sm text-gray-600">{tool.description}</p>}
          </div>
          <div className="flex-shrink-0 text-right">
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${STATUS_STYLES[review.status] ?? "bg-gray-100 text-gray-700"}`}>
              {review.status.replace(/_/g, " ")}
            </span>
            <p className="text-xs text-gray-400 mt-1">Submitted {new Date(review.created_at).toLocaleDateString()}</p>
            {review.reviewed_at && (
              <p className="text-xs text-gray-400">Reviewed {new Date(review.reviewed_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Preview ── */}
      {tool && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Preview</h2>
          <ToolPreview tool={tool} expanded={previewExpanded} onToggle={() => setPreviewExpanded((v) => !v)} />
        </section>
      )}

      {/* ── Reviewer Notes ── */}
      {review.notes && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Reviewer Notes</h2>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-700 leading-relaxed">{review.notes}</p>
            {review.reviewer && (
              <p className="text-xs text-gray-400 mt-2">— {review.reviewer.name}{review.reviewed_at ? `, ${new Date(review.reviewed_at).toLocaleDateString()}` : ""}</p>
            )}
          </div>
        </section>
      )}

      {/* ── Security Document ── */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Security Review Document</h2>
        <p className="text-xs text-gray-400 mb-4">
          Submitted via POST /api/reviews/{review.id}/security-doc
        </p>
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <SecurityDoc doc={review.security_doc ?? {}} />
        </div>
      </section>

    </main>
  )
}

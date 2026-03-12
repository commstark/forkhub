"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"

const SecurityDoc = dynamic(() => import("@/components/SecurityDoc"), { ssr: false })

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

function classificationClass(c: string) {
  if (c === "internal_noncustomer") return "badge-nc"
  if (c === "internal_customer")    return "badge-ic"
  if (c === "external_customer")    return "badge-ec"
  return "badge-neutral"
}

function statusClass(s: string) {
  if (s === "approved")          return "badge-approved"
  if (s === "rejected")          return "badge-rejected"
  if (s === "changes_requested") return "badge-changes"
  if (s === "pending")           return "badge-pending"
  return "badge-neutral"
}

function HtmlPreview({ toolId, expanded, onToggle }: { toolId: string; expanded: boolean; onToggle: () => void }) {
  return (
    <div style={expanded ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "#fff", padding: 24 } : {}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>Live preview</span>
        <div
          onClick={onToggle}
          style={{ width: 12, height: 12, borderRadius: "50%", background: "#28CA41", cursor: "pointer" }}
          title={expanded ? "Minimize" : "Expand fullscreen"}
        />
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
  const name    = tool.file_name.toLowerCase()
  const isHtml  = tool.file_type === "text/html" || name.endsWith(".html")
  const isImage = tool.file_type?.startsWith("image/")

  if (isHtml) return <HtmlPreview toolId={tool.id} expanded={expanded} onToggle={onToggle} />
  if (isImage) return (
    <div className="card card-pad" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 192 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/tools/${tool.id}/file`} alt={tool.file_name} style={{ maxHeight: 384, maxWidth: "100%", objectFit: "contain" }} />
    </div>
  )
  return (
    <div className="card card-pad" style={{ textAlign: "center", color: "var(--text-2)" }}>
      <p style={{ fontWeight: 500, marginBottom: 4 }}>{tool.file_name}</p>
      <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>{tool.file_type} · Preview on tool detail page</p>
      <Link href={`/tool/${tool.id}`} style={{ fontSize: 12, color: "var(--text-2)", textDecoration: "underline" }}>Open tool detail →</Link>
    </div>
  )
}

export default function ReviewDetailPage({ params }: { params: { id: string } }) {
  const [review, setReview]           = useState<Review | null>(null)
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/reviews/${params.id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data) => { setReview(data); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [params.id])

  if (loading)             return <div className="loading-state">Loading…</div>
  if (notFound || !review) return <div className="loading-state">Review not found.</div>

  const tool = review.tool

  return (
    <main className="page-narrow">

      <div className="flex gap-4 mb-6">
        <Link href="/review" className="back-link" style={{ marginBottom: 0 }}>← Review queue</Link>
        {tool && (
          <Link href={`/tool/${tool.id}`} style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }}
            onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-1)" }}
            onMouseOut={(e)  => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)" }}
          >
            View tool →
          </Link>
        )}
      </div>

      {/* Header */}
      <section className="page-section">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2" style={{ flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-1)", letterSpacing: "-0.02em", margin: 0 }}>
                {tool?.title ?? "—"}
              </h1>
              {tool && <span className="ver-pill">V{tool.version_number ?? 1}</span>}
            </div>
            <div className="flex items-center gap-2 mb-2" style={{ flexWrap: "wrap" }}>
              {tool?.creator && (
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                  by <span style={{ color: "var(--text-1)" }}>{tool.creator.name}</span>
                </span>
              )}
              {tool?.classification && (
                <span className={`badge ${classificationClass(tool.classification)}`}>
                  {tool.classification.replace(/_/g, " ")}
                </span>
              )}
              {tool?.category   && <span className="tag">{tool.category}</span>}
              {tool?.file_type  && <span className="tag tag-mono">{tool.file_type}</span>}
            </div>
            {tool?.description && (
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{tool.description}</p>
            )}
          </div>
          <div className="flex-shrink-0" style={{ textAlign: "right" }}>
            <span className={`badge ${statusClass(review.status)}`} style={{ fontSize: 12, padding: "4px 10px" }}>
              {review.status.replace(/_/g, " ")}
            </span>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
              Submitted {new Date(review.created_at).toLocaleDateString()}
            </p>
            {review.reviewed_at && (
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                Reviewed {new Date(review.reviewed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Preview */}
      {tool && (
        <section className="page-section">
          <p className="section-title">Preview</p>
          <ToolPreview tool={tool} expanded={previewExpanded} onToggle={() => setPreviewExpanded((v) => !v)} />
        </section>
      )}

      {/* Reviewer notes */}
      {review.notes && (
        <section className="page-section">
          <p className="section-title">Reviewer Notes</p>
          <div className="notes-box">
            <p style={{ margin: 0 }}>{review.notes}</p>
            {review.reviewer && (
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8, marginBottom: 0 }}>
                — {review.reviewer.name}
                {review.reviewed_at ? `, ${new Date(review.reviewed_at).toLocaleDateString()}` : ""}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Fork banner */}
      {review.security_doc?.change_summary && (
        <section className="page-section">
          <div className="fork-banner">
            <div className="fork-banner-label">Fork Review</div>
            {review.security_doc.parent_version_number != null && (
              <p style={{ fontSize: 13, fontWeight: 500, color: "#78350f", margin: "0 0 4px" }}>
                Changes from V{review.security_doc.parent_version_number}
                {review.security_doc.parent_tool_title && ` of "${review.security_doc.parent_tool_title}"`}
              </p>
            )}
            <p className="fork-banner-text">{review.security_doc.change_summary}</p>
          </div>
        </section>
      )}

      {/* Security doc */}
      <section className="page-section">
        <p className="section-title">Security Review Document</p>
        <div className="card card-pad-lg">
          <SecurityDoc doc={review.security_doc ?? {}} />
        </div>
      </section>

      {/* Original security doc (fork reference) */}
      {review.security_doc?.parent_security_doc && (
        <section className="page-section">
          <p className="section-title">
            Original V{review.security_doc.parent_version_number ?? "?"} Security Doc
            <span style={{ fontWeight: 400, textTransform: "none", color: "var(--text-3)", marginLeft: 6 }}>(Reference)</span>
          </p>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
            The original tool's approved security document for comparison.
          </p>
          <div className="card card-pad-lg" style={{ opacity: 0.75 }}>
            <SecurityDoc doc={review.security_doc.parent_security_doc} />
          </div>
        </section>
      )}

    </main>
  )
}

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

type HistoryReview = {
  id: string; status: string; notes: string | null
  created_at: string; reviewed_at: string | null
  change_description: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  security_doc: Record<string, any> | null
  reviewer: { name: string; avatar_url: string | null } | null
}

type ReviewHistory = {
  tool: { id: string; title: string; creator: { name: string } | null }
  reviews: HistoryReview[]
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

function statusLabel(s: string) {
  if (s === "changes_requested") return "Changes Requested"
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
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

// ── Timeline dot colours ───────────────────────────────────────────────────────
function roundDotColor(isLatest: boolean, reviewerStatus: string | null) {
  if (!reviewerStatus || reviewerStatus === "pending") return isLatest ? "#b45309" : "#9ca3af"
  if (reviewerStatus === "approved")          return "#16a34a"
  if (reviewerStatus === "rejected")          return "#dc2626"
  if (reviewerStatus === "changes_requested") return "#d97706"
  return "#9ca3af"
}

function ReviewerBadgeColor(status: string) {
  if (status === "approved")          return { bg: "#dcfce7", color: "#15803d" }
  if (status === "rejected")          return { bg: "#fee2e2", color: "#b91c1c" }
  if (status === "changes_requested") return { bg: "#fef3c7", color: "#92400e" }
  return { bg: "#f1f5f9", color: "#475569" }
}

function CollapsibleDoc({ doc, defaultOpen }: { doc: Record<string, unknown>; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 12, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
      >
        <span style={{ fontSize: 10 }}>{open ? "▼" : "▶"}</span>
        {open ? "Hide" : "Show"} security doc
      </button>
      {open && (
        <div className="card card-pad" style={{ marginTop: 8, opacity: defaultOpen ? 1 : 0.8 }}>
          <SecurityDoc doc={doc} />
        </div>
      )}
    </div>
  )
}

function ReviewTimeline({ history, creatorName }: {
  history: ReviewHistory
  creatorName: string | null
}) {
  const reviews = history.reviews
  const total   = reviews.length

  if (total === 0) return null

  return (
    <section className="page-section">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <p className="section-title" style={{ margin: 0 }}>Review History</p>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 99,
          background: total >= 5 ? "#fef3c7" : "#f1f5f9",
          color:      total >= 5 ? "#92400e" : "#475569",
        }}>
          Round {total} of review
        </span>
        {total >= 5 && (
          <span style={{ fontSize: 12, color: "#92400e" }}>
            · This tool has been through multiple review rounds — consider a call with the creator.
          </span>
        )}
      </div>

      <div style={{ position: "relative", paddingLeft: 28 }}>
        {/* Vertical timeline line */}
        <div style={{
          position: "absolute", left: 7, top: 8, bottom: 8,
          width: 2, background: "#e5e7eb", borderRadius: 2,
        }} />

        {reviews.map((r, i) => {
          const isLatest = i === total - 1
          const isFirst  = i === 0
          const isResubmit = !isFirst
          const dot = roundDotColor(isLatest, r.status !== "pending" ? r.status : null)
          const reviewerColors = r.status !== "pending" ? ReviewerBadgeColor(r.status) : null

          return (
            <div key={r.id} style={{ position: "relative", marginBottom: isLatest ? 0 : 28 }}>
              {/* Timeline dot */}
              <div style={{
                position: "absolute", left: -24, top: 6,
                width: 10, height: 10, borderRadius: "50%",
                background: dot, border: "2px solid #fff",
                boxShadow: isLatest ? `0 0 0 2px ${dot}` : "none",
                zIndex: 1,
              }} />

              {/* Round label */}
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>
                  Round {i + 1}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 8 }}>
                  {fmt(r.created_at)}
                </span>
                {isLatest && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#b45309", marginLeft: 8 }}>· Current</span>
                )}
              </div>

              {/* Submission row */}
              <div className="card card-pad" style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                      {isResubmit ? "↩ Resubmitted" : "Submitted"} by {creatorName ?? "Creator"}
                    </p>
                    {r.change_description && (
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                        &ldquo;{r.change_description}&rdquo;
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0, paddingTop: 2 }}>
                    {fmt(r.created_at)}
                  </span>
                </div>

                {r.security_doc && (
                  <CollapsibleDoc
                    doc={r.security_doc}
                    defaultOpen={isLatest}
                  />
                )}
              </div>

              {/* Reviewer response */}
              {r.status !== "pending" && reviewerColors && (
                <div style={{
                  marginLeft: 12, padding: "10px 14px", borderRadius: 8,
                  background: reviewerColors.bg,
                  border: `1px solid ${reviewerColors.color}22`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: r.notes ? 6 : 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                      color: reviewerColors.color,
                    }}>
                      {statusLabel(r.status)}
                    </span>
                    {r.reviewer && (
                      <span style={{ fontSize: 12, color: reviewerColors.color, opacity: 0.8 }}>
                        by {r.reviewer.name}
                      </span>
                    )}
                    {r.reviewed_at && (
                      <span style={{ fontSize: 12, color: reviewerColors.color, opacity: 0.7 }}>
                        · {fmt(r.reviewed_at)}
                      </span>
                    )}
                  </div>
                  {r.notes && (
                    <p style={{ margin: 0, fontSize: 13, color: reviewerColors.color, lineHeight: 1.5 }}>
                      &ldquo;{r.notes}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function ReviewDetailPage({ params }: { params: { id: string } }) {
  const [review, setReview]           = useState<Review | null>(null)
  const [history, setHistory]         = useState<ReviewHistory | null>(null)
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/reviews/${params.id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: Review) => {
        setReview(data)
        // Fetch full review history for this tool
        if (data.tool?.id) {
          fetch(`/api/tools/${data.tool.id}/review-history`)
            .then((r) => r.ok ? r.json() : null)
            .then((h) => { if (h) setHistory(h) })
            .catch(() => {})
        }
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [params.id])

  if (loading)             return <div className="loading-state">Loading…</div>
  if (notFound || !review) return <div className="loading-state">Review not found.</div>

  const tool        = review.tool
  const creatorName = tool?.creator?.name ?? history?.tool.creator?.name ?? null

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
              {statusLabel(review.status)}
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

      {/* Review History Timeline */}
      {history && history.reviews.length > 0 && (
        <ReviewTimeline
          history={history}
          creatorName={creatorName}
        />
      )}

      {/* Reviewer notes (current round) */}
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

      {/* Current security doc */}
      <section className="page-section">
        <p className="section-title">Current Security Review Document</p>
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
            The original tool&apos;s approved security document for comparison.
          </p>
          <div className="card card-pad-lg" style={{ opacity: 0.75 }}>
            <SecurityDoc doc={review.security_doc.parent_security_doc} />
          </div>
        </section>
      )}

    </main>
  )
}

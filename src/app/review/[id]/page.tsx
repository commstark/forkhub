"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"

const SecurityDoc = dynamic(() => import("@/components/SecurityDoc"), { ssr: false })

type Tool = {
  id: string; title: string; description: string; classification: string
  file_type: string; file_name: string; file_size: number; category: string
  version_number: number; created_at: string; org_id: string
  creator: { name: string; avatar_url: string | null } | null
  creator_id: string
}

type CustomQuestion = { id: string; question: string; required: boolean }

type StageObject = {
  id: string; name: string; stage_order: number; assigned_role: string
  custom_questions: CustomQuestion[]
  applies_to_classifications: string[]
}

type StageAction = {
  id: string; stage_id: string; action: string; notes: string | null
  stage_answers: Record<string, string> | null
  created_at: string
  actor: { name: string; avatar_url: string | null } | null
}

type Review = {
  id: string; status: string; notes: string | null
  created_at: string; reviewed_at: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  security_doc: Record<string, any> | null
  current_stage_id: string | null
  applicable_stages: string[] | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stage_responses: Record<string, any> | null
  tool: Tool | null
  reviewer: { name: string; avatar_url: string | null } | null
  current_stage: StageObject | null
  stage_actions: StageAction[]
  applicable_stage_objects: StageObject[]
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

// ── Pipeline Progress Bar ─────────────────────────────────────────────────────
function PipelineProgress({
  stages,
  currentStageId,
  stageActions,
  reviewStatus,
}: {
  stages: StageObject[]
  currentStageId: string | null
  stageActions: StageAction[]
  reviewStatus: string
}) {
  if (stages.length === 0) return null

  const isFullyApproved = reviewStatus === "approved"
  const completedStageIds = new Set(
    stageActions.filter((a) => a.action === "approved").map((a) => a.stage_id)
  )

  return (
    <section className="page-section">
      <p className="section-title">Review Pipeline</p>
      <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
        {stages.map((stage, i) => {
          const isCurrent   = stage.id === currentStageId && !isFullyApproved
          const isCompleted = completedStageIds.has(stage.id) || (isFullyApproved)

          const dotBg = isCompleted ? "#16a34a" : isCurrent ? "#b45309" : "#d1d5db"
          const textColor = isCurrent ? "var(--text-1)" : isCompleted ? "#16a34a" : "var(--text-3)"

          return (
            <div key={stage.id} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: dotBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: isCurrent ? `0 0 0 3px ${dotBg}33` : "none",
                  border: isCurrent ? `2px solid ${dotBg}` : "2px solid transparent",
                  flexShrink: 0,
                }}>
                  {isCompleted ? (
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>
                  ) : (
                    <span style={{ color: isCurrent ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 600 }}>{i + 1}</span>
                  )}
                </div>
                <div style={{ textAlign: "center", maxWidth: 80 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: isCurrent ? 600 : 400, color: textColor, lineHeight: 1.3 }}>
                    {stage.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>
                    {stage.assigned_role}
                  </p>
                </div>
              </div>
              {i < stages.length - 1 && (
                <div style={{
                  width: 32, height: 2, margin: "0 4px",
                  marginBottom: 20,
                  background: isCompleted ? "#16a34a" : "#e5e7eb",
                  flexShrink: 0,
                }} />
              )}
            </div>
          )
        })}
        {isFullyApproved && (
          <>
            <div style={{ width: 32, height: 2, margin: "0 4px", marginBottom: 20, background: "#16a34a", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "#16a34a",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#16a34a", textAlign: "center", maxWidth: 60 }}>
                Approved
              </p>
            </div>
          </>
        )}
      </div>

      {/* Stage action history */}
      {stageActions.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {stageActions.map((action) => {
            const matchedStage = stages.find((s) => s.id === action.stage_id)
            const colors = ReviewerBadgeColor(action.action === "changes_requested" ? "changes_requested" : action.action)
            const actionLabel = action.action === "approved" ? "Approved" : action.action === "rejected" ? "Rejected" : "Changes Requested"
            return (
              <div key={action.id} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "8px 12px", borderRadius: 6,
                background: colors.bg, border: `1px solid ${colors.color}22`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: colors.color, minWidth: 90, marginTop: 1 }}>
                  {matchedStage?.name ?? "Stage"}
                </span>
                <span style={{ fontSize: 11, color: colors.color }}>
                  {actionLabel}{action.actor ? ` by ${action.actor.name}` : ""} · {fmt(action.created_at)}
                </span>
                {action.notes && (
                  <span style={{ fontSize: 11, color: colors.color, opacity: 0.8, marginLeft: 4 }}>
                    — &ldquo;{action.notes}&rdquo;
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Current Stage Questions + Action Buttons ─────────────────────────────────
function ActionPanel({
  reviewId,
  reviewStatus,
  currentStage,
  stageResponses,
  userRole,
  onActionComplete,
}: {
  reviewId: string
  reviewStatus: string
  currentStage: StageObject | null
  stageResponses: Record<string, Record<string, string>> | Record<string, string> | null
  userRole: string
  onActionComplete: () => void
}) {
  const [actionMode, setActionMode] = useState<"approve" | "changes" | "reject" | null>(null)
  const [notes, setNotes]           = useState("")

  // stage_responses can be nested {stageId: {questionId: answer}} (new format)
  // or flat {questionId: answer} (legacy). Normalise to flat for the current stage.
  const prefilled: Record<string, string> = (() => {
    if (!stageResponses || !currentStage) return {}
    const first = Object.values(stageResponses)[0]
    if (first && typeof first === "object") {
      // nested format — extract this stage's answers
      return (stageResponses as Record<string, Record<string, string>>)[currentStage.id] ?? {}
    }
    // flat format (legacy)
    return stageResponses as Record<string, string>
  })()

  const [answers, setAnswers] = useState<Record<string, string>>(prefilled)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const canAct = reviewStatus === "pending" && (userRole === "reviewer" || userRole === "admin")
  if (!canAct) return null

  const questions = currentStage?.custom_questions ?? []

  async function submit() {
    if (!actionMode) return
    if ((actionMode === "changes" || actionMode === "reject") && !notes.trim()) {
      setActionError("Notes are required when requesting changes or rejecting.")
      return
    }
    setSubmitting(true)
    setActionError(null)

    const endpoint =
      actionMode === "approve"  ? `/api/reviews/${reviewId}/approve` :
      actionMode === "changes"  ? `/api/reviews/${reviewId}/request-changes` :
                                  `/api/reviews/${reviewId}/reject`

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || null, stage_answers: answers }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error ?? "Action failed")
        setSubmitting(false)
        return
      }
      onActionComplete()
    } catch {
      setActionError("Network error — please try again")
      setSubmitting(false)
    }
  }

  const actionColors: Record<string, { bg: string; border: string; color: string }> = {
    approve:  { bg: "#f0fdf4", border: "#16a34a", color: "#15803d" },
    changes:  { bg: "#fffbeb", border: "#d97706", color: "#92400e" },
    reject:   { bg: "#fef2f2", border: "#dc2626", color: "#b91c1c" },
  }

  return (
    <section className="page-section">
      <p className="section-title">
        {currentStage ? `${currentStage.name} — Your Decision` : "Review Decision"}
      </p>

      {/* Stage questions */}
      {questions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Stage Questions
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {questions.map((q) => (
              <div key={q.id}>
                <label style={{ fontSize: 13, color: "var(--text-1)", display: "block", marginBottom: 4 }}>
                  {q.question}{q.required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
                </label>
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  rows={2}
                  placeholder={answers[q.id] ? "" : "Enter your answer…"}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6,
                    border: "1px solid var(--border)", fontSize: 13,
                    background: answers[q.id] ? "#f0fdf4" : "var(--bg-card)",
                    color: "var(--text-1)", resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!actionMode && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setActionMode("approve")}
            style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #16a34a", background: "#f0fdf4", color: "#15803d", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Approve
          </button>
          <button
            onClick={() => setActionMode("changes")}
            style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #d97706", background: "#fffbeb", color: "#92400e", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Request Changes
          </button>
          <button
            onClick={() => setActionMode("reject")}
            style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #dc2626", background: "#fef2f2", color: "#b91c1c", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Reject
          </button>
        </div>
      )}

      {/* Confirmation form */}
      {actionMode && (
        <div style={{
          padding: 16, borderRadius: 8,
          background: actionColors[actionMode].bg,
          border: `1px solid ${actionColors[actionMode].border}44`,
        }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: actionColors[actionMode].color }}>
            {actionMode === "approve"  ? "Confirm Approval" :
             actionMode === "changes"  ? "Request Changes" :
                                         "Confirm Rejection"}
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={
              actionMode === "approve"
                ? "Optional notes for the creator…"
                : "Required: explain what needs to change… (required)"
            }
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 6,
              border: `1px solid ${actionColors[actionMode].border}66`,
              fontSize: 13, background: "#fff", color: "var(--text-1)",
              resize: "vertical", marginBottom: 10,
              boxSizing: "border-box",
            }}
          />
          {actionError && (
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#dc2626" }}>{actionError}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={submit}
              disabled={submitting}
              style={{
                padding: "8px 18px", borderRadius: 6,
                border: `1px solid ${actionColors[actionMode].border}`,
                background: actionColors[actionMode].border,
                color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Submitting…" : (
                actionMode === "approve"  ? "Confirm Approve" :
                actionMode === "changes"  ? "Send for Changes" :
                                            "Confirm Reject"
              )}
            </button>
            <button
              onClick={() => { setActionMode(null); setActionError(null); setNotes("") }}
              disabled={submitting}
              style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-2)", fontSize: 13, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Review History Timeline ───────────────────────────────────────────────────
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
  const { data: session } = useSession()
  const [review, setReview]           = useState<Review | null>(null)
  const [history, setHistory]         = useState<ReviewHistory | null>(null)
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  const loadReview = useCallback(() => {
    fetch(`/api/reviews/${params.id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: Review) => {
        setReview(data)
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

  useEffect(() => { loadReview() }, [loadReview])

  if (loading)             return <div className="loading-state">Loading…</div>
  if (notFound || !review) return <div className="loading-state">Review not found.</div>

  const tool        = review.tool
  const creatorName = tool?.creator?.name ?? history?.tool.creator?.name ?? null
  const userRole    = session?.user?.role ?? "member"

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

      {/* Pipeline Progress */}
      {review.applicable_stage_objects.length > 0 && (
        <PipelineProgress
          stages={review.applicable_stage_objects}
          currentStageId={review.current_stage_id}
          stageActions={review.stage_actions}
          reviewStatus={review.status}
        />
      )}

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

      {/* Action Panel — shown to reviewers/admins for pending reviews */}
      <ActionPanel
        reviewId={review.id}
        reviewStatus={review.status}
        currentStage={review.current_stage}
        stageResponses={review.stage_responses}
        userRole={userRole}
        onActionComplete={loadReview}
      />

    </main>
  )
}

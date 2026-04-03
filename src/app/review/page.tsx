"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

type ReviewItem = {
  id: string
  status: string
  created_at: string
  reviewed_at: string | null
  tool: {
    id: string
    title: string
    classification: string
    file_type: string
    category: string
    created_at: string
    creator_id: string
    creator: { name: string; avatar_url: string | null } | null
  } | null
}

type ArchivedTool = {
  id: string
  title: string
  classification: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creator: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  archived_by: any
  creator_id: string
  archived_at: string
}

const REVIEW_TABS = [
  { value: "pending",           label: "Pending" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "approved",          label: "Approved" },
  { value: "rejected",          label: "Rejected" },
  { value: "all",               label: "All" },
]

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

export default function ReviewQueuePage() {
  const { data: session }         = useSession()
  const isAdmin                   = session?.user.role === "admin"
  const [reviews, setReviews]     = useState<ReviewItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState("pending")
  const [archivedTools, setArchivedTools]   = useState<ArchivedTool[]>([])
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [unarchivingId, setUnarchivingId]     = useState<string | null>(null)
  const router = useRouter()

  const tabs = [
    ...REVIEW_TABS,
    ...(isAdmin ? [{ value: "archived", label: "Archived" }] : []),
  ]

  useEffect(() => {
    if (activeTab === "archived") {
      setArchivedLoading(true)
      fetch("/api/admin/archived-tools")
        .then((r) => r.json())
        .then((data) => { setArchivedTools(Array.isArray(data) ? data : []); setArchivedLoading(false) })
        .catch(() => setArchivedLoading(false))
    } else {
      setLoading(true)
      fetch(`/api/reviews?status=${activeTab}`)
        .then((r) => r.json())
        .then((data) => { setReviews(Array.isArray(data) ? data : []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [activeTab])

  async function unarchiveTool(id: string) {
    setUnarchivingId(id)
    const res = await fetch(`/api/tools/${id}/unarchive`, { method: "POST" })
    setUnarchivingId(null)
    if (res.ok) setArchivedTools((prev) => prev.filter((t) => t.id !== id))
  }

  const isArchived = activeTab === "archived"
  const isLoading  = isArchived ? archivedLoading : loading

  return (
    <main className="page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Review Queue</h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4, marginBottom: 0 }}>
          Security reviews for your organization
        </p>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`tab${activeTab === tab.value ? " active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="tab-content" key={activeTab + "-loading"} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-row" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>

      ) : isArchived ? (
        // ── Archived tools (admin only) ───────────────────────────────────────
        archivedTools.length === 0 ? (
          <div className="empty-state tab-content" key="archived-empty">
            <p className="empty-state-title">No archived tools</p>
            <p className="empty-state-desc">Soft-deleted tools will appear here</p>
          </div>
        ) : (
          <div className="table-wrap table-scroll tab-content" key="archived">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Creator</th>
                  <th>Classification</th>
                  <th>Archived</th>
                  <th>By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {archivedTools.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>
                      <Link
                        href={`/tool/${t.id}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                        onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline" }}
                        onMouseOut={(e)  => { (e.currentTarget as HTMLElement).style.textDecoration = "none" }}
                      >
                        {t.title}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/profile/${t.creator_id}`}
                        style={{ color: "var(--text-2)", textDecoration: "none", fontSize: 13 }}
                        onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline" }}
                        onMouseOut={(e)  => { (e.currentTarget as HTMLElement).style.textDecoration = "none" }}
                      >
                        {t.creator?.name ?? "—"}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${classificationClass(t.classification)}`}>
                        {t.classification.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-2)" }}>{new Date(t.archived_at).toLocaleDateString()}</td>
                    <td style={{ color: "var(--text-2)", fontSize: 13 }}>{t.archived_by?.name ?? "—"}</td>
                    <td>
                      <button
                        onClick={() => unarchiveTool(t.id)}
                        disabled={unarchivingId === t.id}
                        style={{
                          background: "none", border: "1px solid var(--border)",
                          borderRadius: "var(--r-input)", padding: "4px 10px",
                          fontSize: 12, cursor: "pointer", color: "var(--text-2)",
                          transition: "border-color var(--t)",
                        }}
                        onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)" }}
                        onMouseOut={(e)  => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)" }}
                      >
                        {unarchivingId === t.id ? "Restoring…" : "Unarchive"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      ) : (
        // ── Review tabs ───────────────────────────────────────────────────────
        reviews.length === 0 ? (
          <div className="empty-state tab-content" key={activeTab + "-empty"}>
            <p className="empty-state-title">No pending reviews</p>
            <p className="empty-state-desc">
              {activeTab === "pending" ? "All caught up!" : "Nothing in this queue right now"}
            </p>
            {activeTab === "pending" && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                <a href="/getting-started" style={{ color: "var(--accent)" }}>Learn how the review pipeline works →</a>
              </p>
            )}
          </div>
        ) : (
          <div className="table-wrap table-scroll tab-content" key={activeTab}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Classification</th>
                  <th>Type</th>
                  <th>Submitter</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="clickable" onClick={() => router.push(`/review/${r.id}`)}>
                    <td style={{ fontWeight: 500 }}>{r.tool?.title ?? "—"}</td>
                    <td>
                      {r.tool?.classification && (
                        <span className={`badge ${classificationClass(r.tool.classification)}`}>
                          {r.tool.classification.replace(/_/g, " ")}
                        </span>
                      )}
                    </td>
                    <td className="font-mono" style={{ color: "var(--text-2)" }}>{r.tool?.file_type ?? "—"}</td>
                    <td>
                      {r.tool?.creator_id ? (
                        <Link
                          href={`/profile/${r.tool.creator_id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: "var(--text-2)", textDecoration: "none", fontSize: 13 }}
                          onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline" }}
                          onMouseOut={(e)  => { (e.currentTarget as HTMLElement).style.textDecoration = "none" }}
                        >
                          {r.tool.creator?.name ?? "—"}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--text-2)" }}>{r.tool?.creator?.name ?? "—"}</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-2)" }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${statusClass(r.status)}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </main>
  )
}

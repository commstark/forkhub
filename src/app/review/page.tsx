"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

const TABS = [
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
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reviews?status=${activeTab}`)
      .then((r) => r.json())
      .then((data) => { setReviews(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeTab])

  return (
    <main className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Review Queue</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Security reviews for your organization
          </p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`tab${activeTab === tab.value ? " active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state tab-content" key={activeTab + "-loading"}>Loading…</div>
      ) : reviews.length === 0 ? (
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
                <th>File type</th>
                <th>Creator</th>
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
      )}
    </main>
  )
}

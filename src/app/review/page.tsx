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
    creator: { name: string; avatar_url: string | null } | null
  } | null
}

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

const TABS = [
  { value: "pending",           label: "Pending" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "approved",          label: "Approved" },
  { value: "rejected",          label: "Rejected" },
  { value: "all",               label: "All" },
]

export default function ReviewQueuePage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reviews?status=${activeTab}`)
      .then((r) => r.json())
      .then((data) => { setReviews(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeTab])

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Review Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">All tools pending security review in your org</p>
        </div>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">← Browse</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === tab.value
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">No reviews found</p>
          <p className="text-sm">Nothing in this queue right now</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">Tool</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">Classification</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">File type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">Creator</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">Submitted</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/review/${r.id}`)}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {r.tool?.title ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.tool?.classification && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLASSIFICATION_STYLES[r.tool.classification] ?? "bg-gray-100 text-gray-600"}`}>
                        {r.tool.classification.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.tool?.file_type ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.tool?.creator?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-700"}`}>
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

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Tool = {
  id: string
  title: string
  description: string
  category: string
  classification: string
  status: string
  file_type: string
  file_name: string
  file_size: number
  version_number: number
  rating_avg: number
  rating_count: number
  created_at: string
  review_id: string | null
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  in_review: "bg-yellow-100 text-yellow-800",
  draft: "bg-gray-100 text-gray-800",
  rejected: "bg-red-100 text-red-800",
}

const CLASSIFICATION_STYLES: Record<string, string> = {
  internal_noncustomer: "bg-blue-100 text-blue-800",
  internal_customer: "bg-purple-100 text-purple-800",
  external_customer: "bg-orange-100 text-orange-800",
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function RatingDisplay({ avg, count }: { avg: number; count: number }) {
  if (count === 0) return <span className="text-gray-400">No ratings yet</span>
  return (
    <span>
      ★ {Number(avg).toFixed(1)}{" "}
      <span className="text-gray-400">({count} {count === 1 ? "rating" : "ratings"})</span>
    </span>
  )
}

export default function MyUploads() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/tools/my-uploads")
      .then((res) => res.json())
      .then((data) => { setTools(data); setLoading(false) })
      .catch(() => { setError("Failed to load uploads"); setLoading(false) })
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Uploads</h1>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Browse</Link>
      </div>

      {tools.length === 0 ? (
        <p className="text-gray-500">No uploads yet.</p>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={tool.status === "in_review" && tool.review_id ? `/review/${tool.review_id}` : `/tool/${tool.id}`}
              className="block border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-gray-900">{tool.title}</h2>
                    <span className="text-xs text-gray-400">V{tool.version_number ?? 1}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{tool.description}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[tool.status] ?? "bg-gray-100 text-gray-800"}`}>
                    {tool.status.replace(/_/g, " ")}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${CLASSIFICATION_STYLES[tool.classification] ?? "bg-gray-100 text-gray-800"}`}>
                    {tool.classification.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                <div className="flex gap-4">
                  <span>{tool.file_name}</span>
                  <span>{tool.file_type || "unknown type"}</span>
                  <span>{formatBytes(tool.file_size)}</span>
                  <span>{new Date(tool.created_at).toLocaleDateString()}</span>
                </div>
                <RatingDisplay avg={tool.rating_avg} count={tool.rating_count} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}

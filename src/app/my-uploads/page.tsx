"use client"

import { useEffect, useState } from "react"

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
  created_at: string
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
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">My Uploads</h1>
      {tools.length === 0 ? (
        <p className="text-gray-500">No uploads yet.</p>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => (
            <div key={tool.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-medium text-gray-900">{tool.title}</h2>
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
              <div className="flex gap-4 mt-3 text-xs text-gray-400">
                <span>{tool.file_name}</span>
                <span>{tool.file_type || "unknown type"}</span>
                <span>{formatBytes(tool.file_size)}</span>
                <span>{new Date(tool.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

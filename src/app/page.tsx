"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Creator = { name: string; avatar_url: string | null }

type Tool = {
  id: string
  title: string
  description: string
  category: string
  classification: string
  file_type: string
  fork_count: number
  rating_avg: number
  rating_count: number
  version_number: number
  created_at: string
  creator: Creator | null
}

const CLASSIFICATIONS = [
  { value: "", label: "All classifications" },
  { value: "internal_noncustomer", label: "Internal non-customer" },
  { value: "internal_customer", label: "Internal customer" },
  { value: "external_customer", label: "External customer" },
]

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "most_forked", label: "Most forked" },
  { value: "highest_rated", label: "Highest rated" },
]

const CLASSIFICATION_STYLES: Record<string, string> = {
  internal_noncustomer: "bg-blue-100 text-blue-700",
  internal_customer: "bg-purple-100 text-purple-700",
  external_customer: "bg-orange-100 text-orange-700",
}

function RatingDisplay({ avg, count }: { avg: number; count: number }) {
  if (count === 0) return <span className="text-gray-400">No ratings yet</span>
  return (
    <span className="text-gray-500">
      ★ {Number(avg).toFixed(1)}{" "}
      <span className="text-gray-400">({count} {count === 1 ? "rating" : "ratings"})</span>
    </span>
  )
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link href={`/tool/${tool.id}`} className="block border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="font-medium text-gray-900 leading-snug">{tool.title}</h2>
        <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
          V{tool.version_number ?? 1}
        </span>
      </div>

      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{tool.description}</p>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLASSIFICATION_STYLES[tool.classification] ?? "bg-gray-100 text-gray-600"}`}>
          {tool.classification.replace(/_/g, " ")}
        </span>
        {tool.category && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {tool.category}
          </span>
        )}
        {tool.file_type && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
            {tool.file_type}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{tool.creator?.name ?? "Unknown"}</span>
        <div className="flex items-center gap-3">
          <RatingDisplay avg={tool.rating_avg} count={tool.rating_count} />
          {tool.fork_count > 0 && (
            <span className="text-gray-400">⑂ {tool.fork_count}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function BrowsePage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [fileTypes, setFileTypes] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState("")

  const [filters, setFilters] = useState({
    q: "",
    category: "",
    classification: "",
    file_type: "",
    sort: "newest",
  })

  // Debounce search input → filters.q
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, q: searchInput }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.q) params.set("q", filters.q)
    if (filters.category) params.set("category", filters.category)
    if (filters.classification) params.set("classification", filters.classification)
    if (filters.file_type) params.set("file_type", filters.file_type)
    if (filters.sort !== "newest") params.set("sort", filters.sort)

    setLoading(true)
    fetch(`/api/tools?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const list: Tool[] = Array.isArray(data) ? data : []
        setTools(list)
        if (!filters.category) {
          setCategories(Array.from(new Set(list.map((t) => t.category).filter(Boolean))))
        }
        if (!filters.file_type) {
          setFileTypes(Array.from(new Set(list.map((t) => t.file_type).filter(Boolean))))
        }
        if (!Array.isArray(data)) setError("Failed to load tools")
        setLoading(false)
      })
      .catch(() => { setError("Failed to load tools"); setLoading(false) })
  }, [filters])

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">ForkHub</h1>
        <div className="flex gap-4">
          <Link href="/review" className="text-sm text-gray-500 hover:text-gray-900">Review queue</Link>
          <Link href="/my-uploads" className="text-sm text-gray-500 hover:text-gray-900">My uploads →</Link>
        </div>
      </div>

      {/* Search — live with debounce */}
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search tools…"
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-4"
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap mb-6">
        <select
          value={filters.category}
          onChange={(e) => setFilter("category", e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={filters.classification}
          onChange={(e) => setFilter("classification", e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          {CLASSIFICATIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select
          value={filters.file_type}
          onChange={(e) => setFilter("file_type", e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All file types</option>
          {fileTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filters.sort}
          onChange={(e) => setFilter("sort", e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 ml-auto"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : tools.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">No tools found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
        </div>
      )}
    </main>
  )
}

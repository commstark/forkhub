"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Select from "@/components/Select"

type Creator = { name: string; avatar_url: string | null }
type ParentInfo = { id: string; version_number: number; creator: { name: string } | null } | null

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
  parent_tool_id: string | null
  parent: ParentInfo
  creator_id: string
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

function classificationClass(c: string) {
  if (c === "internal_noncustomer") return "badge-nc"
  if (c === "internal_customer")    return "badge-ic"
  if (c === "external_customer")    return "badge-ec"
  return "badge-neutral"
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="flex items-start justify-between mb-2">
        <span className="skeleton skeleton-line-lg" style={{ width: "60%" }} />
        <span className="skeleton" style={{ width: 28, height: 18, borderRadius: 4 }} />
      </div>
      <span className="skeleton skeleton-line" style={{ width: "90%" }} />
      <span className="skeleton skeleton-line-sm" style={{ width: "70%" }} />
      <div className="flex gap-2 mt-3">
        <span className="skeleton" style={{ width: 90, height: 18 }} />
        <span className="skeleton" style={{ width: 60, height: 18 }} />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 160px 170px 100px 60px", gap: 16, padding: "11px 16px", borderBottom: "1px solid #f0f0f0", alignItems: "center" }}>
      <span className="skeleton skeleton-line" style={{ width: "70%" }} />
      <span className="skeleton" style={{ height: 18, width: 28 }} />
      <span className="skeleton skeleton-line-sm" style={{ width: "80%" }} />
      <span className="skeleton" style={{ height: 18, width: 100 }} />
      <span className="skeleton skeleton-line-sm" style={{ width: 60 }} />
      <span className="skeleton skeleton-line-sm" style={{ width: 30 }} />
    </div>
  )
}

// ─── Rating display ───────────────────────────────────────────────────────────

function RatingDisplay({ avg, count }: { avg: number; count: number }) {
  if (count === 0) return <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
  const full  = Math.round(avg)
  const empty = 5 - full
  return (
    <span className="flex items-center gap-1">
      <span className="stars" style={{ fontSize: 12 }}>
        {"★".repeat(full)}<span className="stars-empty">{"★".repeat(empty)}</span>
      </span>
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>{Number(avg).toFixed(1)}</span>
    </span>
  )
}

// ─── Scroll reveal hook ───────────────────────────────────────────────────────

function useScrollReveal(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect() } },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
}

function RevealSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollReveal(ref as React.RefObject<HTMLElement>)
  return (
    <div ref={ref} className="scroll-reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

// ─── Card view ────────────────────────────────────────────────────────────────

function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  const router = useRouter()
  return (
    <Link
      href={`/tool/${tool.id}`}
      className="card card-pad card-stagger"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="card-title">{tool.title}</span>
        <span className="ver-pill flex-shrink-0">V{tool.version_number ?? 1}</span>
      </div>

      <p className="card-desc">{tool.description}</p>

      <div className="card-tags">
        <span className={`badge ${classificationClass(tool.classification)}`}>
          {tool.classification.replace(/_/g, " ")}
        </span>
        {tool.category  && <span className="tag">{tool.category}</span>}
        {tool.file_type && <span className="tag tag-mono">{tool.file_type}</span>}
      </div>

      <div className="card-footer">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/profile/${tool.creator_id}`) }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-3)" }}
          onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-1)")}
          onMouseOut={(e)  => (e.currentTarget.style.color = "var(--text-3)")}
        >
          {tool.creator?.name ?? "Unknown"}
        </button>
        <div className="flex items-center gap-2">
          <RatingDisplay avg={tool.rating_avg} count={tool.rating_count} />
          {tool.fork_count > 0 && (
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>⑂ {tool.fork_count}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── List view ────────────────────────────────────────────────────────────────

function ToolListRow({ tool, index }: { tool: Tool; index: number }) {
  const router = useRouter()
  return (
    <div
      className="list-view-row card-stagger"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={() => router.push(`/tool/${tool.id}`)}
    >
      <div className="min-w-0">
        <span style={{ fontWeight: 500, fontSize: 13, color: "var(--text-1)" }}>{tool.title}</span>
        {tool.description && (
          <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 8 }} className="truncate">
            {tool.description.slice(0, 60)}{tool.description.length > 60 ? "…" : ""}
          </span>
        )}
      </div>
      <span className="ver-pill">{tool.version_number ?? 1}</span>
      <button
        onClick={(e) => { e.stopPropagation(); router.push(`/profile/${tool.creator_id}`) }}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-2)", textAlign: "left" }}
        onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-1)")}
        onMouseOut={(e)  => (e.currentTarget.style.color = "var(--text-2)")}
      >
        {tool.creator?.name ?? "—"}
      </button>
      <span className={`badge ${classificationClass(tool.classification)}`} style={{ justifySelf: "start" }}>
        {tool.classification.replace(/_/g, " ")}
      </span>
      <RatingDisplay avg={tool.rating_avg} count={tool.rating_count} />
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>
        {tool.fork_count > 0 ? `⑂ ${tool.fork_count}` : "—"}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const [tools, setTools]           = useState<Tool[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [fileTypes, setFileTypes]   = useState<string[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid")

  const [filters, setFilters] = useState({
    q: "", category: "", classification: "", file_type: "", sort: "newest",
  })

  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, q: searchInput })), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.q)              params.set("q", filters.q)
    if (filters.category)       params.set("category", filters.category)
    if (filters.classification) params.set("classification", filters.classification)
    if (filters.file_type)      params.set("file_type", filters.file_type)
    if (filters.sort !== "newest") params.set("sort", filters.sort)

    setLoading(true)
    fetch(`/api/tools?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const list: Tool[] = Array.isArray(data) ? data : []
        setTools(list)
        if (!filters.category)
          setCategories(Array.from(new Set(list.map((t) => t.category).filter(Boolean))))
        if (!filters.file_type)
          setFileTypes(Array.from(new Set(list.map((t) => t.file_type).filter(Boolean))))
        if (!Array.isArray(data)) setError("Failed to load tools")
        setLoading(false)
      })
      .catch(() => { setError("Failed to load tools"); setLoading(false) })
  }, [filters])

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  return (
    <main className="page">

      {/* Search — centered, max 480px */}
      <div className="catalog-search search-with-kbd">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search tools..."
          className="input"
        />
        <kbd
          className="search-kbd"
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
        >
          ⌘K
        </kbd>
      </div>

      {/* Filters row with count + view toggle */}
      <div className="catalog-filters flex gap-2 flex-wrap items-center">
        <Select
          value={filters.category}
          onChange={(v) => setFilter("category", v)}
          options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          value={filters.classification}
          onChange={(v) => setFilter("classification", v)}
          options={CLASSIFICATIONS}
        />
        <Select
          value={filters.file_type}
          onChange={(v) => setFilter("file_type", v)}
          options={[{ value: "", label: "All file types" }, ...fileTypes.map((t) => ({ value: t, label: t }))]}
        />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {!loading && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {tools.length} tool{tools.length === 1 ? "" : "s"}
              {filters.q && ` for "${filters.q}"`}
            </span>
          )}
          <div className="view-toggle">
            <button
              className={`view-toggle-btn${viewMode === "grid" ? " active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="0" y="0" width="6" height="6" rx="1"/>
                <rect x="8" y="0" width="6" height="6" rx="1"/>
                <rect x="0" y="8" width="6" height="6" rx="1"/>
                <rect x="8" y="8" width="6" height="6" rx="1"/>
              </svg>
            </button>
            <button
              className={`view-toggle-btn${viewMode === "list" ? " active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="0" y="1" width="14" height="2" rx="1"/>
                <rect x="0" y="6" width="14" height="2" rx="1"/>
                <rect x="0" y="11" width="14" height="2" rx="1"/>
              </svg>
            </button>
          </div>
          <Select
            value={filters.sort}
            onChange={(v) => setFilter("sort", v)}
            options={SORTS}
            align="right"
          />
        </div>
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {/* Content */}
      {loading ? (
        viewMode === "grid" ? (
          <div className="grid-3">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="table-wrap">
            <div className="list-view-header">
              <span>Tool</span><span>Ver</span><span>Creator</span><span>Classification</span><span>Rating</span><span>Forks</span>
            </div>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )
      ) : tools.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No tools found</p>
          <p className="empty-state-desc">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid-3">
          {tools.map((tool, i) => <ToolCard key={tool.id} tool={tool} index={i} />)}
        </div>
      ) : (
        <div className="table-wrap">
          <div className="list-view-header">
            <span>Tool</span>
            <span>Ver</span>
            <span>Creator</span>
            <span>Classification</span>
            <span>Rating</span>
            <span>Forks</span>
          </div>
          {tools.map((tool, i) => <ToolListRow key={tool.id} tool={tool} index={i} />)}
        </div>
      )}

      {/* Scroll-triggered section — below-fold content */}
      {!loading && tools.length > 0 && (
        <RevealSection delay={100}>
          <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", marginTop: 32 }}>
            {tools.length} tool{tools.length === 1 ? "" : "s"} in the index
          </p>
        </RevealSection>
      )}
    </main>
  )
}

"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

type Creator = { name: string; avatar_url: string | null }
type Tool = {
  id: string
  title: string
  description: string
  category: string
  classification: string
  file_type: string
  version_number: number
  creator_id: string
  creator: Creator | null
  fork_count: number
  rating_avg: number
  rating_count: number
}

function classificationClass(c: string) {
  if (c === "internal_noncustomer") return "badge-nc"
  if (c === "internal_customer")    return "badge-ic"
  if (c === "external_customer")    return "badge-ec"
  return "badge-neutral"
}

export default function CommandPalette() {
  const { data: session } = useSession()
  const [open, setOpen]       = useState(false)
  const [closing, setClosing] = useState(false)
  const [query, setQuery]     = useState("")
  const [results, setResults] = useState<Tool[]>([])
  const [selected, setSelected] = useState(0)
  const [allTools, setAllTools] = useState<Tool[]>([])
  const inputRef   = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // Pre-fetch all tools once on mount (instant results from memory)
  useEffect(() => {
    if (!session) return
    fetch("/api/tools")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllTools(data) })
      .catch(() => {})
  }, [session])

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (open) { closePalette() } else { openPalette() }
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  })

  // Custom event from browse page badge
  useEffect(() => {
    function handler() { openPalette() }
    window.addEventListener("open-command-palette", handler)
    return () => window.removeEventListener("open-command-palette", handler)
  })

  const openPalette = useCallback(() => {
    setOpen(true)
    setClosing(false)
    setQuery("")
    setSelected(0)
    // Short delay so the element is in the DOM before focus
    setTimeout(() => inputRef.current?.focus(), 20)
  }, [])

  const closePalette = useCallback(() => {
    setClosing(true)
    setTimeout(() => { setOpen(false); setClosing(false) }, 110)
  }, [])

  // Filter / search
  useEffect(() => {
    if (!open) return

    const q = query.trim().toLowerCase()

    if (!q) {
      setResults(allTools.slice(0, 8))
      setSelected(0)
      return
    }

    // Instant local filter
    const cached = allTools
      .filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.creator?.name?.toLowerCase().includes(q)
      )
      .slice(0, 8)

    setResults(cached)
    setSelected(0)

    // Debounced API fallback (large orgs or stale cache)
    if (allTools.length > 200 || cached.length === 0) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetch(`/api/tools?q=${encodeURIComponent(query)}`)
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) { setResults(data.slice(0, 8)); setSelected(0) }
          })
          .catch(() => {})
      }, 200)
    }

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, allTools, open])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === "Enter") {
      const tool = results[selected]
      if (tool) { router.push(`/tool/${tool.id}`); closePalette() }
    } else if (e.key === "Escape") {
      closePalette()
    }
  }

  function navigate(id: string) {
    router.push(`/tool/${id}`)
    closePalette()
  }

  if (!open || !session) return null

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

  return (
    <div
      className={`cmd-backdrop${closing ? " cmd-backdrop-close" : ""}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) closePalette() }}
    >
      <div
        className={`cmd-modal${closing ? " cmd-modal-close" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search row */}
        <div className="cmd-search-row">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"
            style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="cmd-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tools, people, categories…"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cmd-esc-hint" onClick={closePalette}>esc</kbd>
        </div>

        <div className="cmd-divider" />

        {/* Results */}
        {results.length === 0 ? (
          <div className="cmd-empty">
            {query.trim() ? "No tools match that search" : "No tools available"}
          </div>
        ) : (
          <div className="cmd-results" role="listbox">
            {!query.trim() && <div className="cmd-section-label">Suggestions</div>}
            {results.map((tool, i) => (
              <button
                key={tool.id}
                role="option"
                aria-selected={i === selected}
                className={`cmd-result${i === selected ? " selected" : ""}`}
                onClick={() => navigate(tool.id)}
                onMouseEnter={() => setSelected(i)}
              >
                <div className="cmd-result-main">
                  <span className="cmd-result-title">{tool.title}</span>
                  <span className="ver-pill" style={{ marginLeft: 8, flexShrink: 0 }}>
                    V{tool.version_number ?? 1}
                  </span>
                </div>
                <div className="cmd-result-meta">
                  {tool.creator?.name && (
                    <span className="cmd-result-creator">{tool.creator.name}</span>
                  )}
                  <span className={`badge ${classificationClass(tool.classification)}`}>
                    {tool.classification.replace(/_/g, " ")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer hints */}
        <div className="cmd-footer">
          <span><kbd className="cmd-key">↑↓</kbd> navigate</span>
          <span><kbd className="cmd-key">↵</kbd> open</span>
          <span><kbd className="cmd-key">{isMac ? "⌘K" : "Ctrl+K"}</kbd> toggle</span>
        </div>
      </div>
    </div>
  )
}

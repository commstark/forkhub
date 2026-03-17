"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"

type UserProfile = {
  id: string; name: string; email: string; avatar_url: string | null
  role: string; department: string | null; created_at: string
  stats: { total_tools: number; total_forks_made: number; total_forked_by_others: number; avg_rating: number; total_ratings: number }
}

type ApiKey = {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
}

type Tool = {
  id: string; title: string; description: string; category: string
  classification: string; file_type: string; fork_count: number
  rating_avg: number; rating_count: number; version_number: number
  parent_tool_id: string | null
  parent: { id: string; version_number: number; creator: { name: string } | null } | null
  status: string; created_at: string; review_id?: string | null
}

function classificationClass(c: string) {
  if (c === "internal_noncustomer") return "badge-nc"
  if (c === "internal_customer")    return "badge-ic"
  if (c === "external_customer")    return "badge-ec"
  return "badge-neutral"
}

function roleClass(r: string) {
  if (r === "admin")    return "badge-admin"
  if (r === "reviewer") return "badge-reviewer"
  return "badge-member"
}

function statusClass(s: string) {
  if (s === "approved")          return "badge-approved"
  if (s === "rejected")          return "badge-rejected"
  if (s === "changes_requested") return "badge-changes"
  if (s === "in_review")         return "badge-pending"
  return "badge-neutral"
}

function RatingStars({ avg, count }: { avg: number; count: number }) {
  if (count === 0) return <span style={{ color: "var(--text-3)", fontSize: 12 }}>No ratings yet</span>
  const full  = Math.round(avg)
  const empty = 5 - full
  return (
    <span className="flex items-center gap-1">
      <span className="stars" style={{ fontSize: 12 }}>
        {"★".repeat(full)}<span className="stars-empty">{"★".repeat(empty)}</span>
      </span>
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>{Number(avg).toFixed(1)} ({count})</span>
    </span>
  )
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link href={`/tool/${tool.id}`} className="card card-pad">
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
        <RatingStars avg={tool.rating_avg} count={tool.rating_count} />
        {tool.fork_count > 0 && <span style={{ fontSize: 12, color: "var(--text-3)" }}>⑂ {tool.fork_count}</span>}
      </div>
    </Link>
  )
}

function PendingCard({ tool }: { tool: Tool }) {
  const href = tool.review_id ? `/review/${tool.review_id}` : `/tool/${tool.id}`
  return (
    <Link href={href} className="card card-pad-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span style={{ fontWeight: 500, color: "var(--text-1)", fontSize: 13 }}>{tool.title}</span>
          <span className="ver-pill ml-2">V{tool.version_number ?? 1}</span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <span className={`badge ${statusClass(tool.status)}`}>{tool.status.replace(/_/g, " ")}</span>
          <span className={`badge ${classificationClass(tool.classification)}`}>{tool.classification.replace(/_/g, " ")}</span>
        </div>
      </div>
      {tool.description && (
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tool.description}
        </p>
      )}
    </Link>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ avatarUrl, name, isOwn, onUpload }: { avatarUrl: string | null; name: string; isOwn: boolean; onUpload: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
  return (
    <div
      className={`avatar${isOwn ? " clickable" : ""}`}
      onClick={() => isOwn && inputRef.current?.click()}
      title={isOwn ? "Click to change avatar" : undefined}
    >
      {avatarUrl
        ? <img src={avatarUrl} alt={name} />
        : <div className="avatar-initials">{initials}</div>
      }
      {isOwn && (
        <>
          <div className="avatar-overlay">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
        </>
      )}
    </div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({
  id, title, count, open, onToggle, children,
}: {
  id: string; title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <section id={id} className="page-section" style={{ marginBottom: 32 }}>
      <div className={`coll-header${open ? "" : " closed"}`} onClick={onToggle}>
        <p className="section-title mb-0" style={{ marginBottom: 0 }}>
          {title} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>({count})</span>
        </p>
        <span className={`coll-chevron${open ? " open" : ""}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      {open && children}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage({ params }: { params: { id: string } }) {
  const { data: session }         = useSession()
  const isOwn                     = session?.user.id === params.id
  const [profile, setProfile]     = useState<UserProfile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [originals, setOriginals] = useState<Tool[]>([])
  const [forks, setForks]         = useState<Tool[]>([])
  const [inReview, setInReview]   = useState<Tool[]>([])
  const [drafts, setDrafts]       = useState<Tool[]>([])
  const [rejected, setRejected]   = useState<Tool[]>([])
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)

  const [apiKeys, setApiKeys]           = useState<ApiKey[]>([])
  const [keysLoading, setKeysLoading]   = useState(false)
  const [newKeyName, setNewKeyName]     = useState("")
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied]   = useState(false)
  const [revokingId, setRevokingId]     = useState<string | null>(null)

  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["originals", "forks"]))

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleAvatarUpload(file: File) {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch(`/api/users/${params.id}/avatar`, { method: "POST", body: fd })
    if (res.ok) {
      // Use proxy URL with cache-bust so the new image loads immediately
      setAvatarUrl(`/api/users/${params.id}/avatar?t=${Date.now()}`)
    }
  }

  async function loadKeys() {
    setKeysLoading(true)
    const data = await fetch("/api/keys").then((r) => r.json())
    setApiKeys(Array.isArray(data) ? data : [])
    setKeysLoading(false)
  }

  async function generateKey() {
    const name = newKeyName.trim() || "My API Key"
    const res = await fetch("/api/keys/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const data = await res.json()
      setGeneratedToken(data.token)
      setNewKeyName("")
      loadKeys()
    }
  }

  async function revokeKey(id: string) {
    setRevokingId(id)
    await fetch(`/api/keys/${id}`, { method: "DELETE" })
    setRevokingId(null)
    setApiKeys((prev) => prev.filter((k) => k.id !== id))
  }

  function copyToken() {
    if (!generatedToken) return
    navigator.clipboard.writeText(generatedToken)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 2000)
  }

  useEffect(() => {
    async function load() {
      const profileRes = await fetch(`/api/users/${params.id}`)
      if (!profileRes.ok) { setNotFound(true); setLoading(false); return }
      const profileData: UserProfile = await profileRes.json()
      setProfile(profileData)
      setAvatarUrl(profileData.avatar_url ?? null)

      const uploadsData = await fetch(`/api/users/${params.id}/tools`).then((r) => r.json())
      const tools: Tool[] = Array.isArray(uploadsData) ? uploadsData : []
      const approved = tools.filter((t) => t.status === "approved")
      setOriginals(approved.filter((t) => !t.parent_tool_id))
      setForks(approved.filter((t) => !!t.parent_tool_id))
      setInReview(tools.filter((t) => t.status === "in_review" || t.status === "changes_requested"))
      setDrafts(tools.filter((t) => t.status === "draft"))
      setRejected(tools.filter((t) => t.status === "rejected"))
      setLoading(false)
    }
    load()
  }, [params.id])

  useEffect(() => {
    if (isOwn) loadKeys()
  }, [isOwn])

  if (loading)             return <div className="loading-state">Loading…</div>
  if (notFound || !profile) return <div className="loading-state">Profile not found.</div>

  return (
    <main className="page-narrow">

      {/* Profile header */}
      <section className="page-section" style={{ marginBottom: 32 }}>
        <div className="flex items-start gap-4">
          <Avatar avatarUrl={avatarUrl} name={profile.name} isOwn={isOwn} onUpload={handleAvatarUpload} />
          <div>
            <div className="flex items-center gap-2 mb-1" style={{ flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-1)", letterSpacing: "-0.02em", margin: 0 }}>
                {profile.name}
              </h1>
              <span className={`badge ${roleClass(profile.role)}`}>{profile.role}</span>
            </div>
            {profile.department && (
              <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 2px" }}>{profile.department}</p>
            )}
            <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
              Member since {new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="page-section" style={{ marginBottom: 40 }}>
        <div className="stat-row">
          <a href="#originals" className="stat-cell stat-cell-link">
            <span className="stat-val">{originals.length}</span>
            <span className="stat-lbl">V1&apos;s Contributed</span>
          </a>
          <a href="#forks" className="stat-cell stat-cell-link">
            <span className="stat-val">{forks.length}</span>
            <span className="stat-lbl">Forks Made</span>
          </a>
          <a href="#review" className="stat-cell stat-cell-link">
            <span className="stat-val">{inReview.length + drafts.length}</span>
            <span className="stat-lbl">In Progress</span>
          </a>
          <div className="stat-cell">
            <span className="stat-val">
              {profile.stats.total_ratings === 0 ? "—" : profile.stats.avg_rating.toFixed(1)}
            </span>
            <span className="stat-lbl">Avg Rating</span>
          </div>
        </div>
      </section>

      {/* V1's Contributed */}
      <CollapsibleSection
        id="originals"
        title="V1's Contributed"
        count={originals.length}
        open={openSections.has("originals")}
        onToggle={() => toggleSection("originals")}
      >
        {originals.length === 0 ? (
          <div style={{ padding: "20px 0" }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 6px" }}>
              {isOwn ? "You haven't uploaded any tools yet." : "No tools contributed yet."}
            </p>
            {isOwn && (
              <a href="/getting-started" style={{ fontSize: 13, color: "var(--accent)" }}>
                Read the Getting Started guide →
              </a>
            )}
          </div>
        ) : (
          <div className="grid-2">
            {originals.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        )}
      </CollapsibleSection>

      {/* Forks Made */}
      <CollapsibleSection
        id="forks"
        title="Forks Made"
        count={forks.length}
        open={openSections.has("forks")}
        onToggle={() => toggleSection("forks")}
      >
        {forks.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>No forks made yet.</p>
        ) : (
          <div className="grid-2">
            {forks.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        )}
      </CollapsibleSection>

      {/* In Review */}
      {(inReview.length > 0 || isOwn) && (
        <CollapsibleSection
          id="review"
          title="In Review"
          count={inReview.length}
          open={openSections.has("review")}
          onToggle={() => toggleSection("review")}
        >
          {inReview.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>Nothing in review.</p>
          ) : (
            <div className="stack">
              {inReview.map((tool) => <PendingCard key={tool.id} tool={tool} />)}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Drafts */}
      {(drafts.length > 0 || isOwn) && (
        <CollapsibleSection
          id="drafts"
          title="Drafts"
          count={drafts.length}
          open={openSections.has("drafts")}
          onToggle={() => toggleSection("drafts")}
        >
          {drafts.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>No drafts.</p>
          ) : (
            <div className="stack">
              {drafts.map((tool) => <PendingCard key={tool.id} tool={tool} />)}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Rejected */}
      {(rejected.length > 0 || isOwn) && (
        <CollapsibleSection
          id="rejected"
          title="Rejected"
          count={rejected.length}
          open={openSections.has("rejected")}
          onToggle={() => toggleSection("rejected")}
        >
          {rejected.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>No rejected tools.</p>
          ) : (
            <div className="stack">
              {rejected.map((tool) => <PendingCard key={tool.id} tool={tool} />)}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* API Keys — own profile only */}
      {isOwn && (
        <CollapsibleSection
          id="api-keys"
          title="API Keys"
          count={apiKeys.length}
          open={openSections.has("api-keys")}
          onToggle={() => toggleSection("api-keys")}
        >
          {/* Generated token — show once */}
          {generatedToken && (
            <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--r-card)", padding: "12px 14px", marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>
                Copy this key now — it will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code style={{ flex: 1, fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-1)", wordBreak: "break-all" }}>
                  {generatedToken}
                </code>
                <button
                  onClick={copyToken}
                  className="btn btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  {tokenCopied ? (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : "Copy"}
                </button>
                <button
                  onClick={() => setGeneratedToken(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-3)", lineHeight: 1, padding: "0 2px" }}
                >×</button>
              </div>
            </div>
          )}

          {/* Create new key */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. CI pipeline)"
              className="input"
              style={{ flex: 1, fontSize: 13, padding: "8px 10px" }}
              onKeyDown={(e) => e.key === "Enter" && generateKey()}
            />
            <button onClick={generateKey} className="btn btn-primary" style={{ flexShrink: 0 }}>
              Generate key
            </button>
          </div>

          {/* Keys list */}
          {keysLoading ? (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>Loading…</p>
          ) : apiKeys.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>No API keys yet.</p>
          ) : (
            <div className="stack">
              {apiKeys.map((key) => (
                <div key={key.id} className="card card-pad-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span style={{ fontWeight: 500, fontSize: 13, color: "var(--text-1)" }}>{key.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 8, fontFamily: "var(--font-mono)" }}>
                      {key.prefix}…
                    </span>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                      Created {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at && (
                        <> · Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => revokeKey(key.id)}
                    disabled={revokingId === key.id}
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--r-input)", padding: "4px 10px", fontSize: 12, color: "var(--danger)", cursor: "pointer", flexShrink: 0, transition: "border-color var(--t)" }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--danger)")}
                    onMouseOut={(e)  => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    {revokingId === key.id ? "Revoking…" : "Revoke"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

    </main>
  )
}

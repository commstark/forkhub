"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

type UserProfile = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: string
  department: string | null
  created_at: string
  stats: {
    total_tools: number
    total_forks_made: number
    total_forked_by_others: number
    avg_rating: number
    total_ratings: number
  }
}

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
  parent: { id: string; version_number: number; creator: { name: string } | null } | null
  status: string
  created_at: string
  review_id?: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  admin:    "bg-red-100 text-red-700",
  reviewer: "bg-blue-100 text-blue-700",
  member:   "bg-gray-100 text-gray-600",
}

const CLASSIFICATION_STYLES: Record<string, string> = {
  internal_noncustomer: "bg-blue-100 text-blue-700",
  internal_customer:    "bg-purple-100 text-purple-700",
  external_customer:    "bg-orange-100 text-orange-700",
}

const STATUS_STYLES: Record<string, string> = {
  in_review: "bg-yellow-100 text-yellow-800",
  draft:     "bg-gray-100 text-gray-600",
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover" />
  }
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600">
      {initials}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

function RatingStars({ avg, count }: { avg: number; count: number }) {
  if (count === 0) return <span className="text-gray-400 text-xs">No ratings yet</span>
  const full  = Math.round(avg)
  const empty = 5 - full
  return (
    <span className="flex items-center gap-1">
      <span className="text-yellow-400 text-xs">
        {"★".repeat(full)}<span className="text-gray-200">{"★".repeat(empty)}</span>
      </span>
      <span className="text-gray-500 text-xs">{Number(avg).toFixed(1)}</span>
      <span className="text-gray-400 text-xs">({count})</span>
    </span>
  )
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/tool/${tool.id}`}
      className="block border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-medium text-gray-900 leading-snug">{tool.title}</h3>
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="text-xs text-gray-400">V{tool.version_number ?? 1}</span>
          {tool.parent && (
            <span className="text-xs text-gray-400">
              from V{tool.parent.version_number ?? 1} by {tool.parent.creator?.name ?? "Unknown"}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{tool.description}</p>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLASSIFICATION_STYLES[tool.classification] ?? "bg-gray-100 text-gray-600"}`}>
          {tool.classification.replace(/_/g, " ")}
        </span>
        {tool.category && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tool.category}</span>
        )}
        {tool.file_type && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{tool.file_type}</span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <RatingStars avg={tool.rating_avg} count={tool.rating_count} />
        {tool.fork_count > 0 && <span className="text-gray-400">⑂ {tool.fork_count}</span>}
      </div>
    </Link>
  )
}

function InReviewCard({ tool }: { tool: Tool }) {
  const href = tool.review_id ? `/review/${tool.review_id}` : `/tool/${tool.id}`
  return (
    <Link
      href={href}
      className="block border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="font-medium text-gray-900">{tool.title}</span>
          <span className="text-xs text-gray-400 ml-2">V{tool.version_number ?? 1}</span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[tool.status] ?? "bg-gray-100 text-gray-600"}`}>
            {tool.status.replace(/_/g, " ")}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${CLASSIFICATION_STYLES[tool.classification] ?? "bg-gray-100 text-gray-600"}`}>
            {tool.classification.replace(/_/g, " ")}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-1 truncate">{tool.description}</p>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile]   = useState<UserProfile | null>(null)
  const [approved, setApproved] = useState<Tool[]>([])
  const [inReview, setInReview] = useState<Tool[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const profileRes = await fetch(`/api/users/${params.id}`)
      if (!profileRes.ok) { setNotFound(true); setLoading(false); return }
      const profileData: UserProfile = await profileRes.json()
      setProfile(profileData)

      // Fetch their tools
      const uploadsData = await fetch(`/api/users/${params.id}/tools`).then((r) => r.json())
      const tools: Tool[] = Array.isArray(uploadsData) ? uploadsData : []
      setApproved(tools.filter((t) => t.status === "approved"))
      setInReview(tools.filter((t) => t.status === "in_review" || t.status === "draft"))
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading)           return <div className="p-8 text-gray-400">Loading…</div>
  if (notFound || !profile) return <div className="p-8 text-gray-500">Profile not found.</div>

  return (
    <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

      <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">← Browse</Link>

      {/* ── Profile header ── */}
      <section className="flex items-start gap-5">
        <Avatar name={profile.name} avatarUrl={profile.avatar_url} />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">{profile.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[profile.role] ?? "bg-gray-100 text-gray-600"}`}>
              {profile.role}
            </span>
          </div>
          {profile.department && (
            <p className="text-sm text-gray-500 mb-1">{profile.department}</p>
          )}
          <p className="text-sm text-gray-400">
            Member since {new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
          </p>
        </div>
      </section>

      {/* ── Stats row ── */}
      <section className="border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-4 gap-6 divide-x divide-gray-200">
          <StatBox label="Tools created"       value={profile.stats.total_tools} />
          <StatBox label="Forks made"          value={profile.stats.total_forks_made} />
          <StatBox label="Forked by others"    value={profile.stats.total_forked_by_others} />
          <StatBox
            label="Avg rating"
            value={profile.stats.total_ratings === 0 ? "—" : `${profile.stats.avg_rating.toFixed(1)} ★`}
          />
        </div>
      </section>

      {/* ── Approved tools ── */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Tools ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-gray-400">No approved tools yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {approved.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        )}
      </section>

      {/* ── In review / draft ── */}
      {inReview.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            In Review / Draft ({inReview.length})
          </h2>
          <div className="space-y-2">
            {inReview.map((tool) => <InReviewCard key={tool.id} tool={tool} />)}
          </div>
        </section>
      )}

    </main>
  )
}

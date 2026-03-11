"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string; name: string; email: string; avatar_url: string | null
  role: string; department: string | null; created_at: string
  stats: { originals: number; forks_made: number; avg_rating: number; total_ratings: number }
}

type OrgInfo = { id: string; name: string; domain: string; plan: string | null; created_at: string }

type IntegrationConfig = {
  integrations?: {
    slack?: { webhook_url?: string }
    linear?: { api_key?: string; project_id?: string }
  }
  custom_vars?: Record<string, string>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  admin:    "bg-red-100 text-red-700",
  reviewer: "bg-blue-100 text-blue-700",
  member:   "bg-gray-100 text-gray-600",
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">{children}</h2>
}

// ─── Secret field with reveal toggle ─────────────────────────────────────────

function SecretField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="text-xs text-gray-400 hover:text-gray-700 px-2"
          title={revealed ? "Hide" : "Reveal"}
        >
          {revealed ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  )
}

// ─── Integration block ────────────────────────────────────────────────────────

function IntegrationBlock({
  title, children, onSave, onTest, saving, testing, testResult,
}: {
  title: string; children: React.ReactNode
  onSave: () => void; onTest?: () => void
  saving: boolean; testing: boolean; testResult: string | null
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {children}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {onTest && (
          <button
            onClick={onTest}
            disabled={testing}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {testing ? "Testing…" : "Test"}
          </button>
        )}
        {testResult && (
          <span className={`text-xs ${testResult.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
            {testResult}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers]           = useState<AdminUser[]>([])
  const [org, setOrg]               = useState<OrgInfo | null>(null)
  const [config, setConfig]         = useState<IntegrationConfig>({})
  const [loading, setLoading]       = useState(true)

  // Slack state
  const [slackUrl, setSlackUrl]           = useState("")
  const [slackSaving, setSlackSaving]     = useState(false)
  const [slackTesting, setSlackTesting]   = useState(false)
  const [slackResult, setSlackResult]     = useState<string | null>(null)

  // Linear state
  const [linearKey, setLinearKey]         = useState("")
  const [linearProject, setLinearProject] = useState("")
  const [linearSaving, setLinearSaving]   = useState(false)
  const [linearTesting, setLinearTesting] = useState(false)
  const [linearResult, setLinearResult]   = useState<string | null>(null)

  // Custom vars state
  const [newVarKey, setNewVarKey]     = useState("")
  const [newVarValue, setNewVarValue] = useState("")
  const [varSaving, setVarSaving]     = useState(false)
  const [revealedVars, setRevealedVars] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status !== "authenticated") return
    if (session.user.role !== "admin") { router.push("/"); return }

    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/org").then((r) => r.json()),
      fetch("/api/admin/integrations").then((r) => r.json()),
    ]).then(([usersData, orgData, configData]) => {
      setUsers(Array.isArray(usersData) ? usersData : [])
      if (orgData && !orgData.error) setOrg(orgData)
      if (configData && !configData.error) {
        setConfig(configData)
        setSlackUrl(configData.integrations?.slack?.webhook_url ?? "")
        setLinearKey(configData.integrations?.linear?.api_key ?? "")
        setLinearProject(configData.integrations?.linear?.project_id ?? "")
      }
      setLoading(false)
    })
  }, [status, session, router])

  async function saveIntegration(integration: string, data: Record<string, string>) {
    const res = await fetch("/api/admin/integrations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integration, ...data }),
    })
    const json = await res.json()
    if (json.config) setConfig(json.config)
    return res.ok
  }

  async function testIntegration(type: string, setResult: (r: string) => void, setTesting: (b: boolean) => void) {
    setTesting(true); setResult("")
    const res = await fetch("/api/admin/integrations/test", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    })
    const json = await res.json()
    setResult(res.ok ? `✅ ${json.message}` : `❌ ${json.error}`)
    setTesting(false)
  }

  async function saveCustomVar() {
    if (!newVarKey.trim()) return
    setVarSaving(true)
    await saveIntegration("custom", { key: newVarKey.trim(), value: newVarValue })
    setNewVarKey(""); setNewVarValue("")
    setVarSaving(false)
  }

  async function deleteCustomVar(key: string) {
    await fetch("/api/admin/integrations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integration: "custom", key, delete: true }),
    })
    setConfig((c) => {
      const vars = { ...(c.custom_vars ?? {}) }
      delete vars[key]
      return { ...c, custom_vars: vars }
    })
  }

  if (loading || status === "loading") return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
          {org && <p className="text-sm text-gray-500 mt-0.5">{org.name}</p>}
        </div>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">← Browse</Link>
      </div>

      {/* ── User Management ── */}
      <section>
        <SectionHeading>User Management</SectionHeading>
        <p className="text-xs text-gray-400 mb-4">Role changes via <code className="bg-gray-100 px-1 rounded">POST /api/admin/users/[id]/role</code></p>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">Department</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 border-b border-gray-200">V1s</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 border-b border-gray-200">Forks</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 border-b border-gray-200">Avg ★</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/profile/${u.id}`} className="font-medium text-gray-900 hover:underline">{u.name}</Link>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[u.role] ?? "bg-gray-100 text-gray-600"}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.department ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{u.stats.originals}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{u.stats.forks_made}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {u.stats.total_ratings === 0 ? "—" : u.stats.avg_rating.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section>
        <SectionHeading>Integrations</SectionHeading>
        <div className="space-y-4">

          {/* Slack */}
          <IntegrationBlock
            title="Slack" saving={slackSaving} testing={slackTesting} testResult={slackResult}
            onSave={async () => {
              setSlackSaving(true)
              await saveIntegration("slack", { webhook_url: slackUrl })
              setSlackSaving(false)
            }}
            onTest={() => testIntegration("slack", setSlackResult, setSlackTesting)}
          >
            <SecretField label="Webhook URL" value={slackUrl} onChange={setSlackUrl} placeholder="https://hooks.slack.com/services/..." />
          </IntegrationBlock>

          {/* Linear */}
          <IntegrationBlock
            title="Linear" saving={linearSaving} testing={linearTesting} testResult={linearResult}
            onSave={async () => {
              setLinearSaving(true)
              await saveIntegration("linear", { api_key: linearKey, project_id: linearProject })
              setLinearSaving(false)
            }}
            onTest={() => testIntegration("linear", setLinearResult, setLinearTesting)}
          >
            <SecretField label="API Key" value={linearKey} onChange={setLinearKey} placeholder="lin_api_..." />
            <div className="mt-2">
              <label className="block text-xs text-gray-500 mb-1">Project ID</label>
              <input
                value={linearProject} onChange={(e) => setLinearProject(e.target.value)}
                placeholder="proj_..."
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </IntegrationBlock>

          {/* Custom Variables */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <p className="text-sm font-medium text-gray-700 mb-3">Custom Variables</p>
            {Object.keys(config.custom_vars ?? {}).length === 0 ? (
              <p className="text-xs text-gray-400 mb-3">No custom variables yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {Object.entries(config.custom_vars ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-shrink-0">{k}</code>
                    <span className="text-xs text-gray-500 flex-1 font-mono">
                      {revealedVars.has(k) ? v : maskDisplay(v)}
                    </span>
                    <button onClick={() => setRevealedVars((s) => { const n = new Set(s); if (n.has(k)) { n.delete(k) } else { n.add(k) }; return n })}
                      className="text-xs text-gray-400 hover:text-gray-700">{revealedVars.has(k) ? "Hide" : "Show"}</button>
                    <button onClick={() => deleteCustomVar(k)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={newVarKey} onChange={(e) => setNewVarKey(e.target.value)} placeholder="KEY"
                className="w-32 border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono" />
              <input value={newVarValue} onChange={(e) => setNewVarValue(e.target.value)} placeholder="value"
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
              <button onClick={saveCustomVar} disabled={varSaving || !newVarKey.trim()}
                className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition">
                {varSaving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Org Info ── */}
      <section>
        <SectionHeading>Org Info</SectionHeading>
        {org && (
          <dl className="space-y-2 text-sm">
            <div className="flex gap-4">
              <dt className="text-gray-500 w-32">Name</dt>
              <dd className="text-gray-900 font-medium">{org.name}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-gray-500 w-32">Domain</dt>
              <dd className="text-gray-700 font-mono">@{org.domain}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-gray-500 w-32">Plan</dt>
              <dd className="text-gray-700">{org.plan ?? "Free"}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-gray-500 w-32">Created</dt>
              <dd className="text-gray-700">{new Date(org.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-gray-500 w-32">Join policy</dt>
              <dd className="text-gray-700">Open — anyone with @{org.domain} joins as member</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-gray-500 w-32"></dt>
              <dd className="text-xs text-gray-400 italic">Invite-only mode coming soon</dd>
            </div>
          </dl>
        )}
      </section>

    </main>
  )
}

function maskDisplay(val: string) {
  if (!val || val.length <= 4) return "****"
  return "****" + val.slice(-4)
}

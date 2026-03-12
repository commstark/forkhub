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

function roleClass(r: string) {
  if (r === "admin")    return "badge-admin"
  if (r === "reviewer") return "badge-reviewer"
  return "badge-member"
}

function maskDisplay(val: string) {
  if (!val || val.length <= 4) return "****"
  return "****" + val.slice(-4)
}

// ─── SecretField ──────────────────────────────────────────────────────────────

function SecretField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="input-row">
        <input
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="btn-ghost btn btn-sm"
          style={{ flexShrink: 0 }}
        >
          {revealed ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  )
}

// ─── IntegrationBlock ─────────────────────────────────────────────────────────

function IntegrationBlock({ title, children, onSave, onTest, saving, testing, testResult }: {
  title: string; children: React.ReactNode
  onSave: () => void; onTest?: () => void
  saving: boolean; testing: boolean; testResult: string | null
}) {
  return (
    <div className="integ-block">
      <p className="integ-title">{title}</p>
      {children}
      <div className="integ-actions">
        <button onClick={onSave} disabled={saving} className="btn btn-primary btn-sm">
          {saving ? "Saving…" : "Save"}
        </button>
        {onTest && (
          <button onClick={onTest} disabled={testing} className="btn btn-secondary btn-sm">
            {testing ? "Testing…" : "Test"}
          </button>
        )}
        {testResult && (
          <span style={{ fontSize: 12, color: testResult.startsWith("✅") ? "var(--success)" : "var(--danger)" }}>
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

  const [users, setUsers]     = useState<AdminUser[]>([])
  const [org, setOrg]         = useState<OrgInfo | null>(null)
  const [config, setConfig]   = useState<IntegrationConfig>({})
  const [loading, setLoading] = useState(true)

  const [slackUrl, setSlackUrl]         = useState("")
  const [slackSaving, setSlackSaving]   = useState(false)
  const [slackTesting, setSlackTesting] = useState(false)
  const [slackResult, setSlackResult]   = useState<string | null>(null)

  const [linearKey, setLinearKey]           = useState("")
  const [linearProject, setLinearProject]   = useState("")
  const [linearSaving, setLinearSaving]     = useState(false)
  const [linearTesting, setLinearTesting]   = useState(false)
  const [linearResult, setLinearResult]     = useState<string | null>(null)

  const [newVarKey, setNewVarKey]       = useState("")
  const [newVarValue, setNewVarValue]   = useState("")
  const [varSaving, setVarSaving]       = useState(false)
  const [revealedVars, setRevealedVars] = useState<Set<string>>(new Set())
  const [userSearch, setUserSearch]     = useState("")

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

  if (loading || status === "loading") return <div className="loading-state">Loading…</div>

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true
    const q = userSearch.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department ?? "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  })

  return (
    <main className="page">

      {/* Header */}
      <div className="flex items-center justify-between mb-6" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title">Admin Panel</h1>
          {org && <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>{org.name}</p>}
        </div>
      </div>

      {/* ── User Management ── */}
      <section className="page-section">
        <h2 className="section-heading">User Management</h2>
        <div className="input-row mb-4" style={{ marginBottom: 16 }}>
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search by name, email, department, or role…"
            className="input"
          />
          {userSearch && (
            <button onClick={() => setUserSearch("")} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
              Clear
            </button>
          )}
        </div>
        <div className="table-wrap table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>V1s</th>
                <th style={{ textAlign: "right" }}>Forks</th>
                <th style={{ textAlign: "right" }}>Avg ★</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/profile/${u.id}`} style={{ fontWeight: 500, color: "var(--text-1)", textDecoration: "none" }}
                      onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline" }}
                      onMouseOut={(e)  => { (e.currentTarget as HTMLElement).style.textDecoration = "none" }}
                    >
                      {u.name}
                    </Link>
                    <p style={{ fontSize: 11, color: "var(--text-3)", margin: "2px 0 0" }}>{u.email}</p>
                  </td>
                  <td><span className={`badge ${roleClass(u.role)}`}>{u.role}</span></td>
                  <td style={{ color: "var(--text-2)" }}>{u.department ?? "—"}</td>
                  <td style={{ color: "var(--text-2)" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right", color: "var(--text-1)" }}>{u.stats.originals}</td>
                  <td style={{ textAlign: "right", color: "var(--text-1)" }}>{u.stats.forks_made}</td>
                  <td style={{ textAlign: "right", color: "var(--text-2)" }}>
                    {u.stats.total_ratings === 0 ? "—" : u.stats.avg_rating.toFixed(1)}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-3)", padding: "24px 16px" }}>
                    No users match your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="page-section">
        <h2 className="section-heading">Integrations</h2>
        <div className="stack" style={{ gap: 12 }}>

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
            <SecretField label="Webhook URL" value={slackUrl} onChange={setSlackUrl} placeholder="https://hooks.slack.com/services/…" />
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
            <SecretField label="API Key" value={linearKey} onChange={setLinearKey} placeholder="lin_api_…" />
            <div className="field">
              <label className="field-label">Project ID</label>
              <input
                value={linearProject}
                onChange={(e) => setLinearProject(e.target.value)}
                placeholder="proj_…"
                className="input"
              />
            </div>
          </IntegrationBlock>

          {/* Custom Variables */}
          <div className="integ-block">
            <p className="integ-title">Custom Variables</p>
            {Object.keys(config.custom_vars ?? {}).length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 14 }}>No custom variables yet.</p>
            ) : (
              <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
                {Object.entries(config.custom_vars ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <code style={{ fontSize: 12, fontFamily: "var(--font-mono)", background: "#f5f5f5", padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>
                      {k}
                    </code>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-2)", flex: 1 }}>
                      {revealedVars.has(k) ? v : maskDisplay(v)}
                    </span>
                    <button
                      onClick={() => setRevealedVars((s) => { const n = new Set(s); if (n.has(k)) { n.delete(k) } else { n.add(k) }; return n })}
                      className="btn-ghost btn btn-sm"
                    >
                      {revealedVars.has(k) ? "Hide" : "Show"}
                    </button>
                    <button onClick={() => deleteCustomVar(k)} className="btn-danger-ghost">Delete</button>
                  </div>
                ))}
              </div>
            )}
            <div className="input-row">
              <input
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                placeholder="KEY"
                className="input input-mono"
                style={{ width: 140, flex: "none" }}
              />
              <input
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                placeholder="value"
                className="input"
              />
              <button
                onClick={saveCustomVar}
                disabled={varSaving || !newVarKey.trim()}
                className="btn btn-primary btn-sm"
                style={{ flexShrink: 0 }}
              >
                {varSaving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Org Info ── */}
      <section className="page-section">
        <h2 className="section-heading">Org Info</h2>
        {org && (
          <dl style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              ["Name",        org.name],
              ["Domain",      `@${org.domain}`],
              ["Plan",        org.plan ?? "Free"],
              ["Created",     new Date(org.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
              ["Join policy", `Open — anyone with @${org.domain} joins as member`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", padding: "9px 0", borderBottom: "1px solid #f5f5f5" }}>
                <dt style={{ width: 140, flexShrink: 0, fontSize: 13, color: "var(--text-2)" }}>{label}</dt>
                <dd style={{ fontSize: 13, color: "var(--text-1)", margin: 0, fontFamily: label === "Domain" ? "var(--font-mono)" : undefined }}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

    </main>
  )
}

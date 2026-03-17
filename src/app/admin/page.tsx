"use client"

import { useEffect, useState, useCallback } from "react"
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

// ─── Review Pipeline ──────────────────────────────────────────────────────────

type CustomQuestion = { id: string; question: string; required: boolean }

type ReviewStage = {
  id: string
  name: string
  stage_order: number
  assigned_role: string
  applies_to_classifications: string[]
  custom_questions: CustomQuestion[]
  notify_email: boolean
  notify_slack: boolean
}

const ALL_CLASSIFICATIONS = [
  { value: "internal_noncustomer", label: "Internal (no customer data)" },
  { value: "internal_customer",    label: "Internal (customer data)" },
  { value: "external_customer",    label: "External (customer-facing)" },
]

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
        cursor: "pointer", padding: "2px 0", fontSize: 13, color: "var(--text-2)",
      }}
    >
      <span style={{
        width: 32, height: 18, borderRadius: 9, background: on ? "var(--success, #22c55e)" : "#d1d5db",
        position: "relative", flexShrink: 0, transition: "background 0.15s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: on ? 14 : 2, width: 14, height: 14,
          borderRadius: "50%", background: "#fff", transition: "left 0.15s",
        }} />
      </span>
      {label}
    </button>
  )
}

function PipelinePreview({ stages }: { stages: ReviewStage[] }) {
  const ordered = [...stages].sort((a, b) => a.stage_order - b.stage_order)

  function stagesFor(classification: string) {
    return ordered.filter((s) =>
      s.applies_to_classifications.length === 0 ||
      s.applies_to_classifications.includes(classification)
    )
  }

  const rows: { label: string; value: string; classification: string }[] = [
    { classification: "internal_noncustomer", label: "internal_noncustomer", value: "" },
    { classification: "internal_customer",    label: "internal_customer",    value: "" },
    { classification: "external_customer",    label: "external_customer",    value: "" },
  ]

  return (
    <div style={{ marginTop: 20, padding: "14px 16px", background: "#fafaf9", border: "1px solid #e8e3dc", borderRadius: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 10 }}>
        Pipeline preview
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map(({ classification, label }) => {
          const applicable = stagesFor(classification)
          return (
            <div key={classification} style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", rowGap: 2 }}>
              <code style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-2)", flexShrink: 0, marginRight: 8 }}>
                {label}
              </code>
              <span style={{ fontSize: 12, color: "var(--text-3)", marginRight: 6 }}>→</span>
              {applicable.length === 0 ? (
                <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 500 }}>Auto-approved</span>
              ) : (
                <>
                  {applicable.map((s, i) => (
                    <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      <span style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 500 }}>{s.name}</span>
                      <span style={{ fontSize: 12, color: "var(--text-3)", margin: "0 6px" }}>→</span>
                      {i === applicable.length - 1 && (
                        <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 500 }}>Approved</span>
                      )}
                    </span>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StageCard({
  stage, index, total,
  onMoveUp, onMoveDown, onDelete, onSave,
}: {
  stage: ReviewStage; index: number; total: number
  onMoveUp: () => void; onMoveDown: () => void
  onDelete: () => void; onSave: (updated: ReviewStage) => Promise<void>
}) {
  const [edit, setEdit]                   = useState<ReviewStage>(stage)
  const [questionsOpen, setQuestionsOpen] = useState(false)
  const [saving, setSaving]               = useState(false)
  const [dirty, setDirty]                 = useState(false)

  function update(patch: Partial<ReviewStage>) {
    setEdit((e) => ({ ...e, ...patch }))
    setDirty(true)
  }

  function toggleClassification(val: string) {
    const current = edit.applies_to_classifications
    const next = current.includes(val) ? current.filter((c) => c !== val) : [...current, val]
    update({ applies_to_classifications: next })
  }

  function addQuestion() {
    const q: CustomQuestion = { id: `q${Date.now()}`, question: "", required: false }
    update({ custom_questions: [...edit.custom_questions, q] })
    setQuestionsOpen(true)
  }

  function updateQuestion(id: string, patch: Partial<CustomQuestion>) {
    update({ custom_questions: edit.custom_questions.map((q) => q.id === id ? { ...q, ...patch } : q) })
  }

  function removeQuestion(id: string) {
    update({ custom_questions: edit.custom_questions.filter((q) => q.id !== id) })
  }

  async function handleSave() {
    setSaving(true)
    await onSave(edit)
    setSaving(false)
    setDirty(false)
  }

  return (
    <div className="integ-block" style={{ position: "relative" }}>
      {/* Stage number + reorder */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%", background: "var(--copper, #b45309)",
            color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {index + 1}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)" }}>
            Stage {index + 1}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={onMoveUp} disabled={index === 0}
            className="btn btn-ghost btn-sm" style={{ padding: "2px 8px", opacity: index === 0 ? 0.3 : 1 }}
            title="Move up"
          >↑</button>
          <button
            onClick={onMoveDown} disabled={index === total - 1}
            className="btn btn-ghost btn-sm" style={{ padding: "2px 8px", opacity: index === total - 1 ? 0.3 : 1 }}
            title="Move down"
          >↓</button>
          <button
            onClick={onDelete} disabled={total === 1}
            className="btn-danger-ghost"
            style={{ fontSize: 12, opacity: total === 1 ? 0.3 : 1 }}
            title={total === 1 ? "Cannot delete the only stage" : "Delete stage"}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Name */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">Stage Name</label>
        <input
          value={edit.name}
          onChange={(e) => update({ name: e.target.value })}
          className="input"
          placeholder="e.g. Security Review"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* Assigned role */}
        <div className="field">
          <label className="field-label">Assigned role</label>
          <select
            value={edit.assigned_role}
            onChange={(e) => update({ assigned_role: e.target.value })}
            className="input"
            style={{ cursor: "pointer" }}
          >
            <option value="reviewer">reviewer</option>
            <option value="admin">admin</option>
            <option value="member">member</option>
          </select>
        </div>

        {/* Notifications */}
        <div className="field">
          <label className="field-label">Notifications</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
            <Toggle on={edit.notify_slack} onToggle={() => update({ notify_slack: !edit.notify_slack })} label="Slack" />
            <Toggle on={edit.notify_email} onToggle={() => update({ notify_email: !edit.notify_email })} label="Email assignees" />
          </div>
        </div>
      </div>

      {/* Applies to classifications */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field-label">Applies to classifications</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 2 }}>
          {ALL_CLASSIFICATIONS.map(({ value, label }) => (
            <label key={value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={edit.applies_to_classifications.includes(value)}
                onChange={() => toggleClassification(value)}
              />
              <span style={{ color: "var(--text-2)" }}>{label}</span>
            </label>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>
          Leave all unchecked to apply this stage to every classification.
        </p>
      </div>

      {/* Custom questions */}
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setQuestionsOpen((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}
        >
          <span style={{ fontSize: 10 }}>{questionsOpen ? "▼" : "▶"}</span>
          Custom Questions
          {edit.custom_questions.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>({edit.custom_questions.length})</span>
          )}
        </button>
        {questionsOpen && (
          <div style={{ marginTop: 10, paddingLeft: 14, borderLeft: "2px solid #e8e3dc" }}>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>
              These questions will be pre-filled by the AI agent during upload. Reviewers verify and complete the answers.
            </p>
            {edit.custom_questions.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>No questions yet.</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {edit.custom_questions.map((q) => (
                <div key={q.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <input
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                    className="input"
                    placeholder="Question text…"
                    style={{ flex: 1 }}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-2)", flexShrink: 0, paddingTop: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="btn-danger-ghost"
                    style={{ fontSize: 12, flexShrink: 0, paddingTop: 6 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addQuestion} className="btn btn-ghost btn-sm">+ Add Question</button>
          </div>
        )}
      </div>

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="btn btn-primary btn-sm"
          style={{ opacity: !dirty ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
      </div>
    </div>
  )
}

function ReviewPipelineSection() {
  const [stages, setStages]     = useState<ReviewStage[]>([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const loadStages = useCallback(async () => {
    const res  = await fetch("/api/admin/review-stages")
    const data = await res.json()
    if (Array.isArray(data)) setStages(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadStages() }, [loadStages])

  async function handleSave(updated: ReviewStage) {
    await fetch(`/api/admin/review-stages/${updated.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:                      updated.name,
        assigned_role:             updated.assigned_role,
        applies_to_classifications: updated.applies_to_classifications,
        custom_questions:          updated.custom_questions,
        notify_email:              updated.notify_email,
        notify_slack:              updated.notify_slack,
      }),
    })
    await loadStages()
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const sorted = [...stages].sort((a, b) => a.stage_order - b.stage_order)
    const swapIdx = direction === "up" ? index - 1 : index + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const reordered = sorted.map((s, i) => ({ ...s }))
    const tmp = reordered[index].stage_order
    reordered[index].stage_order = reordered[swapIdx].stage_order
    reordered[swapIdx].stage_order = tmp

    // Optimistic update
    setStages(reordered.sort((a, b) => a.stage_order - b.stage_order))

    await fetch("/api/admin/review-stages/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reordered.map((s) => ({ id: s.id, stage_order: s.stage_order }))),
    })
    await loadStages()
  }

  async function handleDelete(id: string) {
    setDeleteConfirm(null)
    await fetch(`/api/admin/review-stages/${id}`, { method: "DELETE" })
    await loadStages()
  }

  async function handleAdd() {
    setAdding(true)
    await fetch("/api/admin/review-stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Review Stage" }),
    })
    await loadStages()
    setAdding(false)
  }

  const sorted = [...stages].sort((a, b) => a.stage_order - b.stage_order)

  return (
    <section className="page-section">
      <h2 className="section-heading">Review Pipeline</h2>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20 }}>
        Configure the stages each tool submission passes through before approval. Stages run in order.
        Approving a stage advances to the next — the tool is only marked approved after the final stage clears.
      </p>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--text-3)" }}>Loading…</p>
      ) : (
        <>
          {/* Stage cards */}
          <div className="stack" style={{ gap: 12 }}>
            {sorted.map((stage, i) => (
              <StageCard
                key={stage.id}
                stage={stage}
                index={i}
                total={sorted.length}
                onMoveUp={() => handleMove(i, "up")}
                onMoveDown={() => handleMove(i, "down")}
                onDelete={() => setDeleteConfirm(stage.id)}
                onSave={handleSave}
              />
            ))}
          </div>

          {/* Add Stage */}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="btn btn-secondary btn-sm"
            >
              {adding ? "Adding…" : "+ Add Stage"}
            </button>
          </div>

          {/* Pipeline preview */}
          <PipelinePreview stages={sorted} />
        </>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }}>
          <div className="card card-pad" style={{ maxWidth: 400, width: "90%" }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Delete this stage?</p>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20 }}>
              This removes the stage from the pipeline. Remaining stages will be renumbered.
              Active reviews at this stage will lose their stage assignment.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-sm" style={{ background: "var(--danger, #dc2626)", color: "#fff" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
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

      {/* ── Review Pipeline ── */}
      <ReviewPipelineSection />

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

import Link from "next/link"

export default function GettingStartedPage() {
  return (
    <main className="page-narrow">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 6 }}>
        Getting Started
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 40 }}>
        Everything you need to upload, review, and discover AI tools with your team.
      </p>

      {/* ── Section 1: How ForkHub Works ───────────────────────────────── */}
      <section className="page-section">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
          1. How ForkHub Works
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
          ForkHub is your team&apos;s internal marketplace for AI-generated tools. Upload tools, get them
          reviewed by your security team, and make them discoverable to your whole organization.
          When someone finds a tool they want to build on, they fork it — preserving the original
          creator&apos;s credit while extending the work.
        </p>

        {/* Flow diagram */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto", padding: "4px 0" }}>
          {[
            { icon: "📤", name: "Upload Tool", desc: "Submit via API or Claude Code skill" },
            { icon: "🤖", name: "AI Analysis", desc: "Auto-generates security questionnaire" },
            { icon: "🔍", name: "Security Review", desc: "Your team reviews & approves" },
            { icon: "✅", name: "Approved", desc: "Tool is live and searchable" },
            { icon: "⑂", name: "Discover & Fork", desc: "Teammates find and build on it" },
          ].map((step, i, arr) => (
            <div key={step.name} style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
              <div style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                borderRadius: 8,
                padding: "14px 16px",
                textAlign: "center",
                minWidth: 120,
                flexShrink: 0,
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{step.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{step.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{step.desc}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ color: "var(--accent)", fontWeight: 700, padding: "0 6px", fontSize: 16, flexShrink: 0 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Generate Your API Key ──────────────────────────── */}
      <section className="page-section">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
          2. Generate Your API Key
        </h2>
        <ol style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.9, paddingLeft: 20, margin: "0 0 16px" }}>
          <li>Go to your <Link href="/profile" style={{ color: "var(--accent)" }}>profile page</Link></li>
          <li>Click <strong style={{ color: "var(--text-primary)" }}>&ldquo;Generate API Key&rdquo;</strong></li>
          <li>Copy the key — it&apos;s shown only once (starts with <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg-secondary)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border-default)" }}>sk_fh_...</code>)</li>
          <li>Use it in all API calls via the <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg-secondary)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border-default)" }}>Authorization</code> header</li>
        </ol>
        <pre style={{
          background: "var(--bg-secondary)", border: "1px solid var(--border-default)", borderRadius: 8,
          padding: 16, overflowX: "auto", fontSize: 12, fontFamily: "var(--font-mono)",
          color: "var(--text-primary)", lineHeight: 1.6,
        }}>
{`curl -X POST https://yourorg.forkhub.com/api/tools/upload \\
  -H "Authorization: Bearer sk_fh_..." \\
  -F "title=My Tool" \\
  -F "file=@tool.html"`}
        </pre>
      </section>

      {/* ── Section 3: Upload Your First Tool ─────────────────────────── */}
      <section className="page-section">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
          3. Upload Your First Tool
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>With Claude Code</div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 10px" }}>
              Load the ForkHub skill in Claude Code, describe your tool, and Claude handles
              classification, security doc generation, and upload automatically.
            </p>
            <pre style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border-default)", borderRadius: 6,
              padding: 12, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-primary)", margin: 0,
            }}>
{`# In Claude Code:
/forkhub upload my-tool.html`}
            </pre>
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>Direct API</div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 10px" }}>
              POST directly to the upload endpoint with your file and metadata. Supports any file format.
            </p>
            <pre style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border-default)", borderRadius: 6,
              padding: 12, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-primary)", margin: 0,
            }}>
{`curl -X POST /api/tools/upload \\
  -H "Authorization: Bearer sk_fh_..." \\
  -F "title=My Tool" \\
  -F "classification=internal_noncustomer" \\
  -F "file=@tool.html"`}
            </pre>
          </div>
        </div>
      </section>

      {/* ── Section 4: Understanding Classifications ───────────────────── */}
      <section className="page-section">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
          4. Understanding Classifications
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {[
            {
              color: "#4d7c4d",
              bg: "rgba(77,124,77,0.07)",
              border: "#4d7c4d",
              dot: "🟢",
              label: "internal_noncustomer",
              desc: "Internal only, no customer data",
              detail: "Auto-approved instantly — no review required.",
            },
            {
              color: "#b8860b",
              bg: "rgba(184,134,11,0.07)",
              border: "#b8860b",
              dot: "🟡",
              label: "internal_customer",
              desc: "Touches customer data internally",
              detail: "Goes through your security review pipeline.",
            },
            {
              color: "#b44040",
              bg: "rgba(180,64,64,0.07)",
              border: "#b44040",
              dot: "🔴",
              label: "external_customer",
              desc: "Visible to or used by customers",
              detail: "Full security review pipeline — all stages required.",
            },
          ].map((c) => (
            <div key={c.label} style={{
              background: c.bg, border: `1px solid ${c.border}`,
              borderLeft: `4px solid ${c.border}`, borderRadius: 8, padding: 16,
            }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{c.dot}</div>
              <code style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: c.color, fontWeight: 600 }}>{c.label}</code>
              <p style={{ fontSize: 13, color: "var(--text-primary)", margin: "4px 0 4px", fontWeight: 500 }}>{c.desc}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{c.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 5: How the Review Pipeline Works ──────────────────── */}
      <section className="page-section">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
          5. How the Review Pipeline Works
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>
          Your admin configures an ordered list of review stages. Each stage has a required role
          (e.g. <em>reviewer</em>, <em>legal</em>), a classification filter, and optional custom
          questions. When a reviewer approves at one stage, the tool advances to the next. Once the
          final stage is approved, the tool is live. If no stages apply to your classification, the
          tool is auto-approved instantly.
        </p>

        {/* Example timeline */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-card)", borderRadius: 10,
          padding: 20, marginBottom: 16,
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", margin: "0 0 12px" }}>
            Example pipeline
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Stage 1: Security Review", note: "all tools" },
              { arrow: true },
              { label: "Stage 2: Legal", note: "external only" },
              { arrow: true },
              { label: "✓ Approved", final: true },
            ].map((item, i) => (
              "arrow" in item ? (
                <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>→</span>
              ) : (
                <div key={i} style={{
                  background: item.final ? "rgba(77,124,77,0.1)" : "var(--bg-secondary)",
                  border: `1px solid ${item.final ? "#4d7c4d" : "var(--border-default)"}`,
                  borderRadius: 6, padding: "6px 12px", fontSize: 13,
                  color: item.final ? "#4d7c4d" : "var(--text-primary)", fontWeight: item.final ? 600 : 400,
                }}>
                  {item.label}
                  {item.note && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>({item.note})</span>}
                </div>
              )
            ))}
          </div>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          AI agents (Claude Code) can pre-fill stage question answers at upload time by passing
          a <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--bg-secondary)", padding: "1px 4px", borderRadius: 3, border: "1px solid var(--border-default)" }}>stage_responses</code> JSON object in the upload request.
        </p>
      </section>

      {/* ── Section 6: Forking a Tool ──────────────────────────────────── */}
      <section className="page-section">
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
          6. Forking a Tool
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>
          Find a tool you want to build on and fork it. ForkHub creates a V2 with your changes,
          with the original creator credited. Minor changes (e.g. small UI tweaks) are auto-approved.
          Major changes enter the full review pipeline. Your fork always shows a link back to the
          original tool.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {[
            "Find a tool",
            "→",
            "Fork it (POST /api/tools/{id}/fork)",
            "→",
            "Minor: auto-approved",
            "Major: enters pipeline",
          ].map((step, i) => (
            step === "→" ? (
              <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>→</span>
            ) : (
              <span key={i} style={{
                background: "var(--bg-secondary)", border: "1px solid var(--border-default)",
                borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "var(--text-secondary)",
              }}>
                {step}
              </span>
            )
          ))}
        </div>
      </section>

      {/* ── Section 7: For Admins ──────────────────────────────────────── */}
      <section className="page-section">
        <details>
          <summary style={{
            fontSize: 16, fontWeight: 600, color: "var(--text-primary)", cursor: "pointer",
            listStyle: "none", display: "flex", alignItems: "center", gap: 8, marginBottom: 0,
            padding: "4px 0",
          }}>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>▶</span>
            7. For Admins
          </summary>
          <div style={{ marginTop: 16, paddingLeft: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {[
                {
                  title: "Connect Slack",
                  desc: "Set SLACK_WEBHOOK_URL in your integrations settings to get real-time notifications on review actions.",
                },
                {
                  title: "Manage Users",
                  desc: "GET /api/admin/users to list users. POST /api/admin/users/{id}/role to promote members to reviewer or admin.",
                },
                {
                  title: "Configure Review Pipeline",
                  desc: "GET/POST /api/admin/review-stages to view and create pipeline stages. Each stage has a role, classification filter, and sort order.",
                },
                {
                  title: "Custom Questions Per Stage",
                  desc: "Add a custom_questions array to any stage. Reviewers answer these during review. AI agents can pre-fill answers at upload time.",
                },
              ].map((item) => (
                <div key={item.title} style={{
                  background: "var(--bg-card)", border: "1px solid var(--border-card)", borderRadius: 8, padding: 16,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{item.title}</div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </details>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", padding: "20px 0 0" }}>
        <Link
          href="/browse"
          className="btn btn-primary"
          style={{ fontSize: 14, padding: "10px 24px" }}
        >
          Browse Tools →
        </Link>
      </section>
    </main>
  )
}

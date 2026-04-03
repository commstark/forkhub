import Link from "next/link"

/* ── Shared tokens ─────────────────────────────────────────────────────────── */
const C = {
  copper:   "#c2724f",
  copperDk: "#b45c39",
  bg:       "#f8f6f3",
  bgAlt:    "#f0ece6",
  border:   "#e8e0d6",
  dark:     "#1c1917",
  mid:      "#44403c",
  muted:    "#78716c",
  faint:    "#a8a29e",
}

/* ── Small reusable pieces ─────────────────────────────────────────────────── */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: 11, fontWeight: 600, letterSpacing: "0.07em",
      textTransform: "uppercase" as const,
      color: C.copper, background: "rgba(194,114,79,0.1)",
      border: "1px solid rgba(194,114,79,0.2)",
      borderRadius: 6, padding: "4px 10px",
      marginBottom: 16,
    }}>
      {children}
    </span>
  )
}

function Rule() {
  return (
    <hr style={{
      border: "none", borderTop: `1px solid ${C.border}`,
      margin: "0",
    }} />
  )
}

/* ── Check list item ───────────────────────────────────────────────────────── */
function Check({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
      <span style={{
        flexShrink: 0, marginTop: 2,
        width: 20, height: 20, borderRadius: "50%",
        background: "rgba(194,114,79,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, color: C.copper, fontWeight: 700,
      }}>✓</span>
      <span style={{ fontSize: 17, lineHeight: 1.65, color: C.mid }}>{children}</span>
    </li>
  )
}

/* ── Comparison row ────────────────────────────────────────────────────────── */
function CompRow({ tool, verdict, note }: { tool: string; verdict: "no" | "partial" | "yes"; note: string }) {
  const colors = { no: "#dc2626", partial: "#b45309", yes: "#16a34a" }
  const labels = { no: "✗ No", partial: "~ Partial", yes: "✓ Yes" }
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "140px 100px 1fr",
      padding: "13px 0", borderBottom: `1px solid ${C.border}`,
      gap: 16, alignItems: "center",
    }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>{tool}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, color: colors[verdict],
        background: colors[verdict] + "12", borderRadius: 5,
        padding: "3px 8px", display: "inline-block", textAlign: "center" as const,
      }}>{labels[verdict]}</span>
      <span style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>{note}</span>
    </div>
  )
}

/* ── Feature card ──────────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "24px 24px 22px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        fontSize: 26, marginBottom: 12,
        width: 48, height: 48, borderRadius: 10,
        background: C.bgAlt, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</div>
      <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: C.dark, letterSpacing: "-0.02em" }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 15, color: C.muted, lineHeight: 1.6 }}>{body}</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function WhyForkHubPage() {
  return (
    <>
      <style>{`
        .wfh-btn {
          display: inline-block; background: ${C.copper}; color: #fff;
          font-weight: 600; font-size: 17px; letter-spacing: -0.01em;
          text-decoration: none; border-radius: 10px;
          padding: 14px 32px; transition: background 0.15s, transform 0.15s;
        }
        .wfh-btn:hover { background: ${C.copperDk}; transform: translateY(-1px); }
        .wfh-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 14px; color: ${C.muted}; text-decoration: none;
          transition: color 0.15s;
        }
        .wfh-back:hover { color: ${C.dark}; }
        @media (max-width: 700px) {
          .wfh-comp-grid { grid-template-columns: 1fr !important; }
          .wfh-feat-grid { grid-template-columns: 1fr !important; }
          .wfh-hero-h1   { font-size: 38px !important; }
          .wfh-section   { padding: 56px 20px !important; }
          .wfh-comp-row  { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(248,246,243,0.92)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" className="wfh-back">
            ← Back to home
          </Link>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.dark, letterSpacing: "-0.02em" }}>
            The <span style={{ color: C.copper }}>Fork</span>Hub
          </span>
          <Link href="/login" className="wfh-btn" style={{ fontSize: 13, padding: "7px 16px" }}>
            Get started →
          </Link>
        </div>
      </div>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          className="wfh-section"
          style={{
            background: `linear-gradient(165deg, #faf8f5 0%, ${C.bgAlt} 100%)`,
            padding: "88px 24px 80px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <Pill>Shadow AI Governance</Pill>
            <h1
              className="wfh-hero-h1"
              style={{
                margin: "0 0 24px",
                fontSize: 56,
                fontWeight: 800,
                color: C.dark,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                fontFamily: "var(--font-serif), Georgia, serif",
                fontStyle: "italic",
              }}
            >
              The Shadow AI Problem —{" "}
              <span style={{ color: C.copper }}>and How to Fix It</span>
            </h1>
            <p style={{ margin: "0 auto", fontSize: 20, color: C.mid, lineHeight: 1.65, maxWidth: 600 }}>
              Your employees are already building tools with Claude, Cursor, and Copilot.
              Without a control plane, those tools are invisible, unreviewed, and unshared.
            </p>
          </div>
        </section>

        {/* ── Section 1: Employees are already building ──────────────────── */}
        <section className="wfh-section" style={{ padding: "80px 24px", background: "#fff" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ maxWidth: 680 }}>
              <Pill>The Problem</Pill>
              <h2 style={{
                margin: "0 0 20px", fontSize: 40, fontWeight: 800,
                color: C.dark, letterSpacing: "-0.04em", lineHeight: 1.15,
                fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic",
              }}>
                Your employees are already building with AI
              </h2>
              <p style={{ fontSize: 18, color: C.mid, lineHeight: 1.7, marginBottom: 32 }}>
                75% of knowledge workers are already using AI tools — with or without IT&apos;s blessing.
                They&apos;re generating dashboards, automations, data pipelines, and client-facing reports
                using Claude, Cursor, ChatGPT, and Copilot. Every day, more of your company&apos;s work
                runs through tools nobody officially knows about.
              </p>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1,
              background: C.border, border: `1px solid ${C.border}`,
              borderRadius: 12, overflow: "hidden", marginBottom: 40,
            }}>
              {[
                { stat: "75%",  label: "of knowledge workers use AI tools on the job" },
                { stat: "60%",  label: "of those tools were never reviewed by IT or security" },
                { stat: "1 in 3", label: "enterprises had a data incident from an ungoverned tool" },
              ].map(({ stat, label }) => (
                <div key={stat} style={{ background: C.bg, padding: "28px 24px" }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: C.copper, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>{stat}</div>
                  <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>{label}</div>
                </div>
              ))}
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <Check>Tools live in <strong>Downloads folders, Slack threads, and personal Google Drives</strong> — impossible to find when you need them again.</Check>
              <Check>No security review means <strong>your client data is in tools nobody has audited</strong>. One STRIDE threat model could have caught it.</Check>
              <Check>No version control means <strong>the &quot;fixed&quot; version of that dashboard is someone&apos;s local file</strong>. The rest of the team uses the broken one.</Check>
              <Check>Builders get <strong>no credit for the tools they create</strong>, so the incentive to build well is zero.</Check>
            </ul>
          </div>
        </section>

        <Rule />

        {/* ── Section 2: SharePoint / GitHub ─────────────────────────────── */}
        <section className="wfh-section" style={{ padding: "80px 24px", background: C.bg }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ maxWidth: 680, marginBottom: 48 }}>
              <Pill>Why Existing Tools Fail</Pill>
              <h2 style={{
                margin: "0 0 20px", fontSize: 40, fontWeight: 800,
                color: C.dark, letterSpacing: "-0.04em", lineHeight: 1.15,
                fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic",
              }}>
                SharePoint doesn&apos;t work. GitHub is too technical.
              </h2>
              <p style={{ fontSize: 18, color: C.mid, lineHeight: 1.7 }}>
                Neither platform was built for the reality of AI-generated tools in the enterprise.
                Both fail in different ways — and together, they explain why shadow AI keeps growing.
              </p>
            </div>

            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "0 28px", marginBottom: 40 }}>
              <div style={{
                display: "grid", gridTemplateColumns: "140px 100px 1fr",
                padding: "10px 0", gap: 16,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: C.faint }}>Platform</span>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: C.faint }}>Security review</span>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: C.faint }}>Why it fails</span>
              </div>
              <CompRow tool="SharePoint" verdict="no"      note="Built for Word docs and PDFs. Can't execute code, preview tools, or manage review pipelines. Becomes a graveyard for files nobody can find." />
              <CompRow tool="Confluence" verdict="no"      note="Great for documentation. Terrible for distributable tools. No runnable previews, no fork/version graph, no security workflow." />
              <CompRow tool="GitHub"     verdict="partial" note="Built for engineers. Non-technical builders can't navigate PRs, branch models, or CLI workflows. The review process is code-review, not security-review." />
              <CompRow tool="Google Drive" verdict="no"    note="Zero discoverability, zero review, zero version tracking. The best-case outcome is a shared folder that someone eventually can't find." />
              <CompRow tool="The Fork Hub" verdict="yes"   note="Built for AI-generated tools: any file format, AI-generated security docs, multi-stage review pipeline, live sharing URLs, fork graphs." />
            </div>

            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, maxWidth: 680, margin: 0 }}>
              The problem isn&apos;t that employees lack discipline — it&apos;s that no platform has made the governed path
              easier than the ungoverned one. The Fork Hub changes that.
            </p>
          </div>
        </section>

        <Rule />

        {/* ── Section 3: What ForkHub does differently ───────────────────── */}
        <section className="wfh-section" style={{ padding: "80px 24px", background: "#fff" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ maxWidth: 680, marginBottom: 48 }}>
              <Pill>The Solution</Pill>
              <h2 style={{
                margin: "0 0 20px", fontSize: 40, fontWeight: 800,
                color: C.dark, letterSpacing: "-0.04em", lineHeight: 1.15,
                fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic",
              }}>
                What The Fork Hub does differently
              </h2>
              <p style={{ fontSize: 18, color: C.mid, lineHeight: 1.7 }}>
                Every design decision was made for one person: the non-technical employee who just built
                something great in Claude and has no idea what to do with it next.
              </p>
            </div>

            <div
              className="wfh-feat-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 48 }}
            >
              <FeatureCard
                icon="📁"
                title="Upload any file format"
                body="HTML, Python, Excel, Jupyter notebooks, ZIP archives. If your AI agent built it, The Fork Hub can store and preview it."
              />
              <FeatureCard
                icon="🛡️"
                title="AI-generated STRIDE security docs"
                body="Every upload gets an automatic threat model. Security teams see spoofing, tampering, and data sensitivity assessments before they ever open a review."
              />
              <FeatureCard
                icon="⚙️"
                title="Configurable multi-stage review"
                body="Define your own pipeline: Security → Legal → Team Lead, or whatever your org needs. Tools can't go live until every stage is cleared."
              />
              <FeatureCard
                icon="🔗"
                title="Live sharing URLs"
                body="Approved tools get a live URL you can share with anyone — including customers. No deployment required. No IT ticket."
              />
              <FeatureCard
                icon="🍴"
                title="Fork any tool"
                body="See something that almost works? Fork it, modify it, and submit your version. Full version history, full builder credit, complete lineage graph."
              />
              <FeatureCard
                icon="👤"
                title="Builder profiles"
                body="Every tool is attributed. Builders build reputations. Managers can see who's creating value. The best tools rise to the top."
              />
            </div>
          </div>
        </section>

        <Rule />

        {/* ── Section 4: Built for the AI coding era ─────────────────────── */}
        <section className="wfh-section" style={{ padding: "80px 24px", background: C.bg }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 64, flexWrap: "wrap" as const, alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 400px" }}>
                <Pill>Built for 2025+</Pill>
                <h2 style={{
                  margin: "0 0 20px", fontSize: 40, fontWeight: 800,
                  color: C.dark, letterSpacing: "-0.04em", lineHeight: 1.15,
                  fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic",
                }}>
                  Built for the AI coding era
                </h2>
                <p style={{ fontSize: 18, color: C.mid, lineHeight: 1.7, marginBottom: 28 }}>
                  The Fork Hub doesn&apos;t care which AI wrote your tool.
                  Claude, Cursor, GPT-4o, GitHub Copilot — it doesn&apos;t matter.
                  What matters is what the tool does, and whether it&apos;s safe to ship.
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  <Check><strong>Tool-agnostic:</strong> works with any AI coding assistant or vibe-coding environment.</Check>
                  <Check><strong>Agent-native upload:</strong> the AI agent handles classification, security doc generation, and submission. The builder just reviews and clicks submit.</Check>
                  <Check><strong>Security team gets a complete threat assessment</strong> before any tool touches production data or a customer screen.</Check>
                  <Check><strong>No engineering overhead:</strong> non-technical builders don&apos;t need to know what a pull request is.</Check>
                </ul>
              </div>
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
                  <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: C.faint }}>Compatible with</p>
                  {[
                    { name: "Claude / Claude Code", tag: "Anthropic" },
                    { name: "Cursor",               tag: "AI editor" },
                    { name: "ChatGPT / GPT-4o",     tag: "OpenAI" },
                    { name: "GitHub Copilot",        tag: "Microsoft" },
                    { name: "Replit AI",             tag: "Replit" },
                    { name: "Any vibe-coding tool",  tag: "All others" },
                  ].map(({ name, tag }) => (
                    <div key={name} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 0", borderBottom: `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontSize: 15, color: C.dark, fontWeight: 500 }}>{name}</span>
                      <span style={{ fontSize: 11, color: C.copper, background: "rgba(194,114,79,0.1)", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>{tag}</span>
                    </div>
                  ))}
                  <p style={{ margin: "14px 0 0", fontSize: 13, color: C.faint, lineHeight: 1.5 }}>
                    If it produces a file, The Fork Hub can govern it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Rule />

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="wfh-section" style={{ padding: "96px 24px", background: "#fff", textAlign: "center" }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{
              width: 48, height: 4, background: C.copper, borderRadius: 2,
              margin: "0 auto 32px",
            }} />
            <h2 style={{
              margin: "0 0 16px", fontSize: 40, fontWeight: 800,
              color: C.dark, letterSpacing: "-0.04em", lineHeight: 1.15,
              fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic",
            }}>
              The tools exist. The governance doesn&apos;t. Yet.
            </h2>
            <p style={{ margin: "0 0 36px", fontSize: 18, color: C.mid, lineHeight: 1.65 }}>
              Get started for free. Invite your team, configure your review pipeline,
              and give your employees a place to put the tools they&apos;re building.
            </p>
            <Link href="/login" className="wfh-btn">
              Get started for free →
            </Link>
            <p style={{ margin: "20px 0 0", fontSize: 14, color: C.faint }}>
              No credit card required. Set up in minutes.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        background: C.bg,
        padding: "28px 24px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.dark, letterSpacing: "-0.02em" }}>
            The <span style={{ color: C.copper }}>Fork</span>Hub
          </span>
          <span style={{ fontSize: 13, color: C.faint }}>The control plane for employee-built AI tools.</span>
          <Link href="/" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>← Back to home</Link>
        </div>
      </footer>
    </>
  )
}

"use client"

import { useEffect, useRef } from "react"

/* ── Scroll reveal ─────────────────────────────────────────────────────────── */
function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.transitionDelay = `${delay}ms`
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("lp-in"); obs.disconnect() } },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])
  return ref
}

function Reveal({ children, delay = 0, style }: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties
}) {
  const ref = useReveal(delay)
  return <div ref={ref} className="lp-reveal" style={style}>{children}</div>
}

/* ── Browser frame ─────────────────────────────────────────────────────────── */
function Frame({ url, children, dark = false, tilt = false, style }: {
  url: string; children: React.ReactNode; dark?: boolean; tilt?: boolean; style?: React.CSSProperties
}) {
  return (
    <div style={{
      borderRadius: 12, overflow: "hidden",
      border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e8e0d6",
      boxShadow: dark
        ? "0 48px 120px rgba(0,0,0,0.7), 0 8px 32px rgba(0,0,0,0.4)"
        : "0 16px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.05)",
      transform: tilt ? "perspective(1400px) rotateX(2deg)" : undefined,
      transformOrigin: "center top",
      ...style,
    }}>
      <div style={{
        background: dark ? "#141927" : "#f0ece6",
        padding: "9px 14px",
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid #e8e0d6",
      }}>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {["#ff5f57","#ffbd2e","#28ca41"].map((c, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div style={{
          flex: 1, textAlign: "center",
          background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          borderRadius: 5, padding: "3px 10px",
          fontSize: 10, color: dark ? "rgba(255,255,255,0.2)" : "#a8a29e",
          fontFamily: "monospace", letterSpacing: "0.02em",
        }}>{url}</div>
      </div>
      {children}
    </div>
  )
}

/* ── Browse mockup (hero) ──────────────────────────────────────────────────── */
const MOCK = [
  { t: "Client Health Dashboard",  tag: "external", a: "J. Horovitz", s: 5, v: 1, c: "#b44040" },
  { t: "ACME Health Dashboard",    tag: "external", a: "J. Horovitz", s: 5, v: 2, c: "#b44040" },
  { t: "STRIDE Threat Analyzer",   tag: "internal", a: "QA Reviewer", s: 4, v: 1, c: "#9a5c3a" },
  { t: "Sprint Velocity Tracker",  tag: "internal", a: "S. Kim",      s: 5, v: 3, c: "#64748b" },
  { t: "Onboarding Flow Builder",  tag: "external", a: "A. Mbeki",    s: 4, v: 1, c: "#b44040" },
  { t: "Budget Variance Report",   tag: "internal", a: "M. Lee",      s: 5, v: 2, c: "#9a5c3a" },
]

function BrowseMockup() {
  return (
    <div style={{ background: "#f8f6f3", padding: "14px 16px 12px", height: 310, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 28, background: "#fff", border: "1px solid #e8e0d6", borderRadius: 7, display: "flex", alignItems: "center", padding: "0 9px", gap: 5 }}>
          <svg width="9" height="9" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.25 }}>
            <circle cx="6.5" cy="6.5" r="5.5" stroke="#1c1917" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 9, color: "#a8a29e" }}>Search 6 tools…</span>
          <span style={{ marginLeft: "auto", fontSize: 8, color: "#a8a29e", background: "#f0ece6", padding: "1px 4px", borderRadius: 2, fontFamily: "monospace" }}>⌘K</span>
        </div>
        {["All","HTML","Python"].map(f => (
          <span key={f} style={{ fontSize: 8, padding: "3px 7px", borderRadius: 4, background: f === "All" ? "#c2724f" : "#fff", color: f === "All" ? "#fff" : "#78716c", border: "1px solid " + (f === "All" ? "transparent" : "#e8e0d6") }}>{f}</span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
        {MOCK.map((t, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #ebe5dd", borderRadius: 7, padding: "10px 10px 8px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, marginBottom: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: "#1c1917", lineHeight: 1.35 }}>{t.t}</span>
              <span style={{ fontSize: 7, color: "#a8a29e", flexShrink: 0, marginTop: 1 }}>V{t.v}</span>
            </div>
            <p style={{ fontSize: 8, color: "#78716c", margin: "0 0 6px" }}>{t.a}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 7, fontWeight: 500, padding: "1px 4px", borderRadius: 2, background: t.c + "11", color: t.c, borderLeft: `2px solid ${t.c}` }}>{t.tag}</span>
              <span style={{ fontSize: 8, color: "#b8860b" }}>{"★".repeat(t.s)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Review pipeline mockup ────────────────────────────────────────────────── */
function ReviewMockup() {
  const stages = [
    { name: "Security", done: true },
    { name: "Legal",    done: true },
    { name: "Team Lead",done: false, current: true },
  ]
  return (
    <div style={{ background: "#fff", border: "1px solid #ebe5dd", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0ece6" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1c1917" }}>Client Health Dashboard</span>
          <span style={{ fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 4, background: "rgba(184,134,11,0.08)", color: "#b8860b" }}>● In Review</span>
        </div>
        <span style={{ fontSize: 11, color: "#a8a29e" }}>by Jonathan Horovitz · external customer</span>
      </div>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0ece6" }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a8a29e", margin: "0 0 14px" }}>Review Pipeline</p>
        <div style={{ display: "flex", alignItems: "center" }}>
          {stages.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: s.done ? "#16a34a" : s.current ? "#b45309" : "#e5e7eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: s.current ? "0 0 0 3px rgba(180,83,9,0.15)" : "none",
                }}>
                  {s.done
                    ? <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>
                    : <span style={{ color: s.current ? "#fff" : "#9ca3af", fontSize: 8, fontWeight: 600 }}>{i+1}</span>
                  }
                </div>
                <span style={{ fontSize: 8, color: s.current ? "#b45309" : s.done ? "#16a34a" : "#a8a29e", fontWeight: (s.current || s.done) ? 600 : 400, textAlign: "center", whiteSpace: "nowrap" }}>{s.name}</span>
              </div>
              {i < stages.length - 1 && <div style={{ width: 44, height: 1.5, background: s.done ? "#16a34a" : "#e5e7eb", margin: "0 4px", marginBottom: 18 }} />}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "14px 20px" }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a8a29e", margin: "0 0 10px" }}>AI Security Document</p>
        {[
          ["Risk Level",       "Low"],
          ["Data Sensitivity", "Internal metrics only"],
          ["Network Access",   "None — fully client-side"],
          ["STRIDE",           "Spoofing: Low · Tampering: None"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 10 }}>
            <span style={{ color: "#78716c", minWidth: 110, flexShrink: 0 }}>{k}</span>
            <span style={{ color: "#1c1917", fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Dashboard CSS art ─────────────────────────────────────────────────────── */
const BARS = [45,52,38,61,55,42,68,50,44,58,47,53]
const CLIENTS = [
  { name: "Meridian Corp",    status: "healthy", csat: 4.9, mrr: "$24.5k" },
  { name: "Atlas Industries", status: "healthy", csat: 4.7, mrr: "$18.2k" },
  { name: "Pinnacle Group",   status: "warning", csat: 3.8, mrr: "$31.0k" },
]

type DashboardProps = {
  accent: string; bg: string; border: string
  textPrimary: string; textMuted: string
  statusColor: (s: string) => string
  label: string
}

function Dashboard({ accent, bg, border, textPrimary, textMuted, statusColor, label }: DashboardProps) {
  const kpis = [
    { l: "Active Clients", v: "247",  up: true,  ch: "+12%" },
    { l: "Avg CSAT",       v: "4.6",  up: true,  ch: "+0.3" },
    { l: "Response",       v: "2.1h", up: true,  ch: "↑ 18%" },
    { l: "At-Risk",        v: "3",    up: false, ch: "+2" },
  ]
  return (
    <div style={{ background: bg, padding: "14px 15px", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>
          <span style={{ color: accent }}>{label}</span> Health Dashboard
        </h2>
        <span style={{ fontSize: 8, background: statusColor("healthy") + "18", color: statusColor("healthy"), padding: "2px 6px", borderRadius: 3, fontWeight: 600 }}>● Live</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginBottom: 10 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 6, padding: "7px 7px 5px" }}>
            <p style={{ fontSize: 7, color: textMuted, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.l}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: "0 0 1px", letterSpacing: "-0.03em", lineHeight: 1 }}>{k.v}</p>
            <p style={{ fontSize: 7, fontWeight: 500, color: k.up ? "#16a34a" : "#dc2626", margin: 0 }}>{k.ch}</p>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 6, padding: "7px 9px", marginBottom: 8 }}>
        <p style={{ fontSize: 7, fontWeight: 600, color: textMuted, margin: "0 0 5px" }}>Ticket Volume · Last 12 weeks</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 34 }}>
          {BARS.map((v, i) => (
            <div key={i} style={{ flex: 1, background: accent, opacity: 0.25 + (v / 80) * 0.75, height: `${(v / 70) * 100}%`, borderRadius: "2px 2px 0 0", minWidth: 3 }} />
          ))}
        </div>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 58px 28px 44px", padding: "4px 8px", background: bg, borderBottom: `1px solid ${border}` }}>
          {["Client","Health","CSAT","MRR"].map(h => (
            <span key={h} style={{ fontSize: 7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: textMuted }}>{h}</span>
          ))}
        </div>
        {CLIENTS.map((c, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 58px 28px 44px", padding: "5px 8px", borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.04)" : "none", alignItems: "center" }}>
            <span style={{ fontSize: 8, fontWeight: 500, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
            <span style={{ fontSize: 7, fontWeight: 500, color: statusColor(c.status), background: statusColor(c.status) + "18", padding: "1px 5px", borderRadius: 3 }}>
              {c.status === "healthy" ? "● Healthy" : "◐ Warning"}
            </span>
            <span style={{ fontSize: 8, color: textPrimary }}>{c.csat}</span>
            <span style={{ fontSize: 8, color: textPrimary }}>{c.mrr}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Marquee ───────────────────────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  "Client Health Dashboard","ACME Health Dashboard","STRIDE Threat Analyzer",
  "Sprint Velocity Tracker","Onboarding Flow Builder","Budget Variance Report",
  "Customer Churn Monitor","API Usage Dashboard","Sales Pipeline Tracker",
  "Support Ticket Heatmap","Runway Calculator","Incident Response Runbook",
]

function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  return (
    <div style={{ overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#070a16" }}>
      <div style={{ display: "flex", padding: "13px 0", animation: "lp-marquee 36s linear infinite", width: "max-content" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 500, whiteSpace: "nowrap", padding: "0 18px" }}>{item}</span>
            <span style={{ color: "rgba(194,114,79,0.35)", fontSize: 10 }}>·</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  return (
    <>
      <style>{`
        .lp-reveal { opacity:0; transform:translateY(18px); transition: opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1); }
        .lp-reveal.lp-in { opacity:1; transform:translateY(0); }
        @keyframes lp-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .lp-nav { position:fixed;top:16px;left:0;right:0;z-index:200;display:flex;justify-content:center;padding:0 24px;pointer-events:none; }
        .lp-nav-inner {
          max-width:960px;width:100%;pointer-events:auto;
          background:rgba(248,246,243,0.88);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(0,0,0,0.07);border-radius:14px;
          padding:10px 20px;display:flex;align-items:center;justify-content:space-between;
          box-shadow:0 2px 16px rgba(0,0,0,0.07);
        }
        .lp-btn { display:inline-block;background:#c2724f;color:#fff;font-weight:600;letter-spacing:-0.01em;text-decoration:none;border-radius:9px;transition:background 0.15s,transform 0.15s; }
        .lp-btn:hover { background:#b45c39;transform:translateY(-1px); }
        .lp-step-ghost { position:absolute;top:12px;right:16px;font-size:96px;font-weight:800;line-height:1;color:rgba(0,0,0,0.04);letter-spacing:-0.06em;user-select:none;pointer-events:none; }
        .lp-feat-row { display:grid;grid-template-columns:220px 1fr;padding:22px 0;gap:40px;align-items:start;border-bottom:1px solid rgba(255,255,255,0.05); }
        .lp-feat-row:first-child { border-top:1px solid rgba(255,255,255,0.05); }
        @media(max-width:900px){
          .lp-hero-h{font-size:40px!important}
          .lp-h2{font-size:34px!important}
          .lp-steps{grid-template-columns:1fr!important}
          .lp-split{flex-direction:column!important}
          .lp-live{grid-template-columns:1fr!important}
          .lp-feat-row{grid-template-columns:1fr!important;gap:4px!important}
          .lp-nav-inner{padding:8px 14px}
        }
      `}</style>

      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <span style={{ color: "#1c1917", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
            The <span style={{ color: "#c2724f" }}>Fork</span>Hub
          </span>
          <a href="/api/auth/signin" className="lp-btn" style={{ fontSize: 13, padding: "7px 16px" }}>Sign in →</a>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section style={{
        minHeight: "100vh",
        background: "linear-gradient(165deg, #faf8f5 0%, #f4f1ec 55%, #f0ece6 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 110, paddingBottom: 0, paddingLeft: 24, paddingRight: 24,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.025) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(194,114,79,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        <Reveal style={{ textAlign: "center", maxWidth: 800, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(0,0,0,0.25)", fontFamily: "monospace" }}>The ForkHub</span>
            <span style={{ color: "rgba(0,0,0,0.1)", fontSize: 12 }}>—</span>
            <span style={{ fontSize: 11, color: "rgba(0,0,0,0.2)", fontStyle: "italic" }}>the github for humans</span>
          </div>
          <h1 className="lp-hero-h" style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.04em", margin: "0 0 24px", color: "#1c1917" }}>
            Your team builds tools<br />with AI. Now there&apos;s<br />
            <span style={{ color: "rgba(0,0,0,0.28)" }}>a place for them.</span>
          </h1>
          <p style={{ fontSize: 16, color: "#78716c", lineHeight: 1.7, margin: "0 auto 36px", maxWidth: 540 }}>
            Store, review, share, and fork. With a full security pipeline built in.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <a href="/api/auth/signin" className="lp-btn" style={{ fontSize: 15, padding: "13px 28px" }}>Get Started — Free</a>
            <span style={{ fontSize: 11, color: "rgba(0,0,0,0.22)", letterSpacing: "0.03em" }}>No credit card · Works with Claude, Cursor, any AI tool</span>
          </div>
        </Reveal>

        <Reveal delay={100} style={{ width: "100%", maxWidth: 860, marginTop: 56, position: "relative", flexShrink: 0 }}>
          <Frame url="forkhub.vercel.app/browse" tilt>
            <BrowseMockup />
          </Frame>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(transparent, #f4f1ec)", pointerEvents: "none" }} />
        </Reveal>
      </section>

      {/* ══ MARQUEE ══ */}
      <Marquee />

      {/* ══ HOW IT WORKS ══ */}
      <section style={{ background: "#f8f6f3", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <Reveal style={{ marginBottom: 64 }}>
            <h2 className="lp-h2" style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.035em", color: "#1c1917", margin: 0, lineHeight: 1.1 }}>
              From build to company-wide.<br />
              <span style={{ color: "rgba(0,0,0,0.25)" }}>In under a minute.</span>
            </h2>
          </Reveal>
          <div className="lp-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "rgba(0,0,0,0.05)", borderRadius: 14, overflow: "hidden" }}>
            {[
              { n: "01", title: "Build",  desc: "Your team uses Claude, Cursor, or any AI agent to build tools — HTML, Python, Jupyter, anything." },
              { n: "02", title: "Upload", desc: "One API call. The AI uploads the tool, fills out the STRIDE security review, and submits for approval." },
              { n: "03", title: "Share",  desc: "Approved tools get a live URL. Fork for clients. Change the branding. Share in under a minute." },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 70}>
                <div style={{ background: "#f8f6f3", padding: "40px 32px 44px", position: "relative", height: "100%", boxSizing: "border-box" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c2724f", margin: "0 0 10px" }}>Step {s.n}</p>
                  <h3 style={{ fontSize: 28, fontWeight: 700, color: "#1c1917", margin: "0 0 14px", letterSpacing: "-0.03em" }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECURITY (split) ══ */}
      <section style={{ background: "#f8f6f3", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div className="lp-split" style={{ display: "flex", gap: 80, alignItems: "flex-start" }}>
            <Reveal style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <h2 className="lp-h2" style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.035em", color: "#1c1917", lineHeight: 1.1, margin: "0 0 40px" }}>
                Security reviews,<br />automated.
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                {[
                  "AI-generated STRIDE threat modeling from source code",
                  "Configurable multi-stage pipeline — Security, Legal, Team Lead",
                  "Full audit trail — every version, every change, every reviewer",
                  "Slack notifications in real time as stages complete",
                ].map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 2, height: 44, background: "#c2724f", opacity: 0.45, flexShrink: 0, marginTop: 2, borderRadius: 1 }} />
                    <p style={{ fontSize: 15, color: "#44403c", lineHeight: 1.65, margin: 0 }}>{b}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={90} style={{ flex: 1, minWidth: 0 }}>
              <ReviewMockup />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ FORK DEMO ══ */}
      <section style={{ background: "#fff", padding: "96px 24px", borderTop: "1px solid #f0ece6" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <Reveal style={{ marginBottom: 56 }}>
            <h2 className="lp-h2" style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.04em", color: "#1c1917", margin: "0 0 14px", lineHeight: 1.05 }}>
              Fork it.<br />&lt;1 minute.
            </h2>
            <p style={{ fontSize: 15, color: "#78716c", margin: 0, maxWidth: 420, lineHeight: 1.65 }}>
              Same tool, different client, different brand. Every approved tool gets a permanent live URL.
            </p>
          </Reveal>
          <div className="lp-live" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <Reveal delay={40}>
              <Frame url="forkhub.vercel.app/live/client-health-dashboard">
                <Dashboard
                  accent="#c2724f" bg="#f4f1ed" border="#e8e0d6"
                  textPrimary="#1c1917" textMuted="#a8a29e"
                  statusColor={(s) => s === "healthy" ? "#4d7c4d" : s === "warning" ? "#b8860b" : "#b44040"}
                  label="Client"
                />
              </Frame>
              <p style={{ textAlign: "center", fontSize: 11, color: "#a8a29e", marginTop: 10 }}>Original · Copper warm branding</p>
            </Reveal>
            <Reveal delay={110}>
              <Frame url="forkhub.vercel.app/live/acme-health-dashboard">
                <Dashboard
                  accent="#2563eb" bg="#f0f4ff" border="#dbeafe"
                  textPrimary="#0f172a" textMuted="#94a3b8"
                  statusColor={(s) => s === "healthy" ? "#16a34a" : s === "warning" ? "#d97706" : "#dc2626"}
                  label="ACME"
                />
              </Frame>
              <p style={{ textAlign: "center", fontSize: 11, color: "#a8a29e", marginTop: 10 }}>Forked · ACME blue branding</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section style={{ background: "#07091a", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <Reveal style={{ marginBottom: 64 }}>
            <h2 className="lp-h2" style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.035em", color: "#fff", margin: 0, lineHeight: 1.1 }}>
              Everything you need.<br />
              <span style={{ color: "rgba(255,255,255,0.22)" }}>Nothing you don&apos;t.</span>
            </h2>
          </Reveal>
          <div>
            {[
              { t: "AI Security Docs",   d: "Auto-generated STRIDE threat models from source code. Reviewers get real context — not just a file name." },
              { t: "Live Serving",       d: "Every approved tool gets a permanent shareable URL. A link that always points to the latest approved version." },
              { t: "Fork & Version",     d: "V1 → V2 → V3 with full lineage. See every parent, every child. Fork for a customer, change a logo, share the URL." },
              { t: "Multi-Stage Review", d: "Security → Legal → Team Lead. Configurable per org. Custom questions per stage. Manager routing built in." },
              { t: "Any File Type",      d: "HTML, Python scripts, Jupyter notebooks, PDFs, Excel workbooks — ForkHub accepts and previews all of them." },
              { t: "API-First",          d: "Everything via REST API. Give Claude your API key and it uploads, fills the security doc, and submits autonomously." },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 35}>
                <div className="lp-feat-row">
                  <span style={{ fontSize: 19, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{f.t}</span>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.36)", lineHeight: 1.72, margin: 0 }}>{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ background: "#07091a", padding: "112px 24px 96px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <Reveal>
          <h2 className="lp-h2" style={{ fontSize: 60, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.08, color: "#fff", margin: "0 auto 40px", maxWidth: 640 }}>
            Stop losing tools<br />in Downloads folders.
          </h2>
          <a href="/api/auth/signin" className="lp-btn" style={{ fontSize: 16, padding: "14px 36px" }}>Get Started — Free</a>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", marginTop: 16, letterSpacing: "0.02em" }}>No credit card required · Works with any AI coding tool</p>
        </Reveal>
      </section>

      {/* Footer */}
      <footer style={{ background: "#07091a", borderTop: "1px solid rgba(255,255,255,0.04)", padding: "24px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "-0.01em" }}>The <span style={{ color: "rgba(194,114,79,0.4)" }}>Fork</span>Hub</span>
          <div style={{ display: "flex", gap: 24 }}>
            {[["Getting Started","/getting-started"],["Browse","/browse"],["Sign In","/api/auth/signin"]].map(([l, h]) => (
              <a key={l} href={h} style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </>
  )
}

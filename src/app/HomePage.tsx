"use client"

import { useEffect, useRef, useState } from "react"

/* ── Scroll reveal ── */
function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.transitionDelay = `${delay}ms`
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("lp-in"); obs.disconnect() } },
      { threshold: 0.06, rootMargin: "0px 0px -40px 0px" }
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

/* ── Browser chrome frame ── */
function BrowserFrame({ url, children, dark = true, tilt = false, style }: {
  url?: string; children: React.ReactNode; dark?: boolean; tilt?: boolean; style?: React.CSSProperties
}) {
  return (
    <div style={{
      borderRadius: 12, overflow: "hidden",
      border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.09)",
      boxShadow: dark
        ? "0 48px 120px rgba(0,0,0,0.75), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)"
        : "0 20px 60px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)",
      transform: tilt ? "perspective(1400px) rotateX(3deg) rotateY(-1deg)" : undefined,
      transformOrigin: "center top",
      ...style,
    }}>
      <div style={{
        background: dark ? "#141927" : "#f0ece6",
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10,
        borderBottom: dark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.07)",
      }}>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {["#ff5f57","#ffbd2e","#28ca41"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        {url && (
          <div style={{
            flex: 1, textAlign: "center",
            background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            borderRadius: 5, padding: "3px 12px",
            fontSize: 11, color: dark ? "rgba(255,255,255,0.22)" : "#a8a29e",
            fontFamily: "monospace", letterSpacing: "0.02em",
          }}>{url}</div>
        )}
      </div>
      {children}
    </div>
  )
}

/* ── Browse page mockup ── */
const MOCK_TOOLS = [
  { title: "Client Health Dashboard", tag: "external", author: "J. Horovitz", stars: 5, v: 1, c: "#b44040" },
  { title: "ACME Health Dashboard",   tag: "external", author: "J. Horovitz", stars: 5, v: 2, c: "#b44040" },
  { title: "STRIDE Threat Analyzer",  tag: "internal", author: "QA Reviewer", stars: 4, v: 1, c: "#9a5c3a" },
  { title: "Sprint Velocity Tracker", tag: "internal", author: "S. Kim",       stars: 5, v: 3, c: "#64748b" },
  { title: "Onboarding Flow Builder", tag: "external", author: "A. Mbeki",     stars: 4, v: 1, c: "#b44040" },
  { title: "Budget Variance Report",  tag: "internal", author: "M. Lee",       stars: 5, v: 2, c: "#9a5c3a" },
]

function BrowseMockup() {
  return (
    <div style={{ background: "#f8f6f3", padding: "16px 18px 12px", height: 340, overflow: "hidden" }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{
          flex: 1, height: 32, background: "#fff", border: "1px solid #e8e0d6",
          borderRadius: 8, display: "flex", alignItems: "center", padding: "0 10px", gap: 6,
        }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.28 }}>
            <circle cx="6.5" cy="6.5" r="5.5" stroke="#1c1917" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 10, color: "#a8a29e" }}>Search 6 tools…</span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "#a8a29e", background: "#f0ece6", padding: "1px 4px", borderRadius: 3, fontFamily: "monospace" }}>⌘K</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {["All","HTML","Python"].map(f => (
            <span key={f} style={{
              fontSize: 9, padding: "3px 7px", borderRadius: 4, cursor: "default",
              background: f === "All" ? "#c2724f" : "#fff",
              color: f === "All" ? "#fff" : "#78716c",
              border: "1px solid " + (f === "All" ? "transparent" : "#e8e0d6"),
            }}>{f}</span>
          ))}
        </div>
      </div>
      {/* grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {MOCK_TOOLS.map((t, i) => (
          <div key={i} style={{
            background: "#fff", border: "1px solid #ebe5dd", borderRadius: 8,
            padding: "12px 12px 10px",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3, marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#1c1917", lineHeight: 1.35 }}>{t.title}</span>
              <span style={{ fontSize: 8, color: "#a8a29e", flexShrink: 0, marginTop: 1 }}>V{t.v}</span>
            </div>
            <p style={{ fontSize: 8, color: "#78716c", margin: "0 0 7px" }}>{t.author}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{
                fontSize: 8, fontWeight: 500, padding: "1px 4px", borderRadius: 2,
                background: t.c + "11", color: t.c, borderLeft: `2px solid ${t.c}`,
              }}>{t.tag}</span>
              <span style={{ fontSize: 9, color: "#b8860b", letterSpacing: -1 }}>{"★".repeat(t.stars)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Review pipeline mockup ── */
function ReviewMockup() {
  const stages = [
    { name: "Security Review", role: "reviewer", done: true },
    { name: "Legal Review",    role: "admin",    done: true },
    { name: "Team Lead",       role: "admin",    done: false, current: true },
  ]
  return (
    <div style={{ background: "#fff", border: "1px solid #ebe5dd", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
      {/* header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0ece6" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1c1917" }}>Client Health Dashboard</span>
          <span style={{ fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 4, background: "rgba(184,134,11,0.08)", color: "#b8860b" }}>● In Review</span>
        </div>
        <span style={{ fontSize: 11, color: "#a8a29e" }}>by Jonathan Horovitz · external customer</span>
      </div>
      {/* pipeline */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0ece6" }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a8a29e", margin: "0 0 12px" }}>Review Pipeline</p>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {stages.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: s.done ? "#16a34a" : s.current ? "#b45309" : "#e5e7eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: s.current ? "0 0 0 3px rgba(180,83,9,0.2)" : "none",
                }}>
                  {s.done
                    ? <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>
                    : <span style={{ color: s.current ? "#fff" : "#9ca3af", fontSize: 9, fontWeight: 600 }}>{i+1}</span>
                  }
                </div>
                <span style={{ fontSize: 8, color: s.current ? "#b45309" : s.done ? "#16a34a" : "#a8a29e", fontWeight: s.current || s.done ? 600 : 400, textAlign: "center", whiteSpace: "nowrap" }}>{s.name}</span>
              </div>
              {i < stages.length - 1 && (
                <div style={{ width: 40, height: 1.5, background: s.done ? "#16a34a" : "#e5e7eb", margin: "0 4px", marginBottom: 20 }} />
              )}
            </div>
          ))}
        </div>
      </div>
      {/* security doc snippet */}
      <div style={{ padding: "14px 20px" }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a8a29e", margin: "0 0 10px" }}>AI Security Document</p>
        {[
          ["Risk Level", "Low"],
          ["Data Sensitivity", "Internal metrics only"],
          ["Network Access", "None — fully client-side"],
          ["STRIDE Threats", "Spoofing: Low · Tampering: None"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 10 }}>
            <span style={{ color: "#78716c", minWidth: 110 }}>{k}</span>
            <span style={{ color: "#1c1917", fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Lazy iframe ── */
function LiveTool({ toolId, title }: { toolId: string; title: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setLoaded(true); obs.disconnect() } },
      { rootMargin: "300px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={wrapRef}>
      <BrowserFrame url={`forkhub.vercel.app/live/${toolId}`} dark={false}>
        <div style={{ height: 320, overflow: "hidden", background: "#f4f1ed" }}>
          {loaded ? (
            <iframe
              src={`/preview/${toolId}`}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              sandbox="allow-scripts allow-same-origin"
              title={title}
              loading="lazy"
            />
          ) : (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #e8e0d6", borderTopColor: "#c2724f", animation: "lp-spin 0.7s linear infinite" }} />
              <span style={{ fontSize: 11, color: "#a8a29e" }}>{title}</span>
            </div>
          )}
        </div>
      </BrowserFrame>
      <p style={{ textAlign: "center", fontSize: 11, color: "#a8a29e", marginTop: 10 }}>{title}</p>
    </div>
  )
}

/* ── Main page ── */
export default function HomePage() {
  // Ambient glow on mouse move in hero
  const heroRef = useRef<HTMLElement>(null)
  const [glow, setGlow] = useState({ x: 50, y: 40 })
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    function onMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect()
      setGlow({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top)  / rect.height) * 100,
      })
    }
    el.addEventListener("mousemove", onMove)
    return () => el.removeEventListener("mousemove", onMove)
  }, [])

  return (
    <>
      {/* ── CSS ── */}
      <style>{`
        .lp-reveal { opacity: 0; transform: translateY(22px); transition: opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1); }
        .lp-reveal.lp-in { opacity: 1; transform: translateY(0); }
        @keyframes lp-spin { to { transform: rotate(360deg); } }
        @keyframes lp-float {
          0%, 100% { transform: perspective(1400px) rotateX(3deg) translateY(0px); }
          50%       { transform: perspective(1400px) rotateX(3deg) translateY(-6px); }
        }
        @keyframes lp-glow-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
        .lp-cta-btn {
          display: inline-block;
          background: linear-gradient(135deg, #c2724f 0%, #b45d38 100%);
          color: #fff; font-weight: 600; font-size: 15px; letter-spacing: -0.01em;
          padding: 13px 28px; border-radius: 10px; text-decoration: none;
          box-shadow: 0 4px 20px rgba(194,114,79,0.35), 0 1px 0 rgba(255,255,255,0.1) inset;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }
        .lp-cta-btn:hover {
          box-shadow: 0 8px 32px rgba(194,114,79,0.45), 0 1px 0 rgba(255,255,255,0.1) inset;
          transform: translateY(-1px);
        }
        .lp-step-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 28px 24px;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .lp-step-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(194,114,79,0.2);
        }
        .lp-feat-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; padding: 20px;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .lp-feat-card:hover {
          background: rgba(255,255,255,0.045);
          border-color: rgba(194,114,79,0.18);
        }
        .lp-pill-nav {
          position: fixed; top: 16px; left: 0; right: 0;
          display: flex; justify-content: center;
          padding: 0 24px; z-index: 200; pointer-events: none;
        }
        .lp-pill-inner {
          max-width: 960px; width: 100%; pointer-events: auto;
          background: rgba(10,15,30,0.7);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 10px 20px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        }
        @media (max-width: 640px) {
          .lp-hero-headline { font-size: 36px !important; }
          .lp-mockup-wrap { display: none; }
          .lp-steps-grid { grid-template-columns: 1fr !important; }
          .lp-split { flex-direction: column !important; }
          .lp-live-grid { grid-template-columns: 1fr !important; }
          .lp-feat-grid { grid-template-columns: 1fr !important; }
          .lp-pill-inner { padding: 8px 14px; }
        }
        @media (max-width: 900px) {
          .lp-feat-grid { grid-template-columns: repeat(2,1fr) !important; }
          .lp-steps-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>

      {/* ── Floating pill nav ── */}
      <nav className="lp-pill-nav">
        <div className="lp-pill-inner">
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
            The <span style={{ color: "#c2724f" }}>Fork</span>Hub
          </span>
          <a href="/api/auth/signin" className="lp-cta-btn" style={{ padding: "7px 16px", fontSize: 13 }}>
            Sign in →
          </a>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section ref={heroRef} style={{
        minHeight: "100vh",
        background: `
          radial-gradient(ellipse 900px 700px at ${glow.x}% ${glow.y}%, rgba(194,114,79,0.09) 0%, transparent 65%),
          radial-gradient(ellipse 600px 400px at 70% 80%, rgba(100,80,200,0.04) 0%, transparent 60%),
          linear-gradient(160deg, #07091a 0%, #0f172a 50%, #131c30 100%)
        `,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 100,
        paddingBottom: 80,
        paddingLeft: 24, paddingRight: 24,
        position: "relative", overflow: "hidden",
      }}>
        {/* subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />

        {/* eyebrow */}
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c2724f", animation: "lp-glow-pulse 2.5s ease-in-out infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              The control plane for AI-built tools
            </span>
          </div>
        </Reveal>

        {/* headline */}
        <Reveal delay={60} style={{ textAlign: "center", maxWidth: 760 }}>
          <h1 className="lp-hero-headline" style={{
            fontSize: 60, fontWeight: 700, lineHeight: 1.08,
            letterSpacing: "-0.04em", margin: "0 0 20px",
            color: "#fff",
          }}>
            Your team builds tools<br />
            <span style={{ color: "transparent", backgroundClip: "text", WebkitBackgroundClip: "text", backgroundImage: "linear-gradient(135deg, #e8956d 0%, #c2724f 40%, #a85e3d 100%)" }}>
              with AI.
            </span>{" "}
            <span style={{ color: "rgba(255,255,255,0.9)" }}>Now there&apos;s<br />a place for them.</span>
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "0 auto 36px", maxWidth: 560 }}>
            Store, review, share, and fork — with a full security pipeline built in.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <a href="/api/auth/signin" className="lp-cta-btn">
              Get Started — Free
            </a>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
              No credit card required · Works with any AI coding tool
            </span>
          </div>
        </Reveal>

        {/* hero product mockup */}
        <Reveal delay={160} style={{ width: "100%", maxWidth: 900, marginTop: 64 }} >
          <div className="lp-mockup-wrap" style={{
            animation: "lp-float 6s ease-in-out infinite",
          }}>
            <BrowserFrame url="forkhub.vercel.app/browse" dark tilt={false} style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <BrowseMockup />
            </BrowserFrame>
          </div>
          {/* bottom fade */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 120,
            background: "linear-gradient(to bottom, transparent, #0f172a)",
            pointerEvents: "none",
          }} />
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: HOW IT WORKS
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ background: "#0a0e1d", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#c2724f", margin: "0 0 14px" }}>How it works</p>
            <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", margin: 0 }}>
              From idea to company-wide tool<br />
              <span style={{ color: "rgba(255,255,255,0.35)" }}>in minutes.</span>
            </h2>
          </Reveal>

          <div className="lp-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              {
                num: "01",
                title: "Build",
                desc: "Your team builds tools with Claude, Cursor, or any AI coding agent. HTML, Python, Jupyter — anything.",
              },
              {
                num: "02",
                title: "Upload",
                desc: "One API call. The AI agent uploads the tool, fills out the STRIDE security review, and submits for approval.",
              },
              {
                num: "03",
                title: "Share",
                desc: "Approved tools get a live URL. Fork for variations. Share with customers. Full version lineage maintained.",
              },
            ].map((step, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="lp-step-card">
                  <p style={{ fontSize: 32, fontWeight: 800, color: "#c2724f", opacity: 0.5, margin: "0 0 16px", letterSpacing: "-0.04em", lineHeight: 1 }}>
                    {step.num}
                  </p>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.02em" }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: SECURITY REVIEW (split — light bg)
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ background: "#f8f6f3", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div className="lp-split" style={{ display: "flex", gap: 64, alignItems: "center" }}>
            {/* left */}
            <Reveal style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#c2724f", margin: "0 0 14px" }}>Security built in</p>
              <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", color: "#1c1917", lineHeight: 1.15, margin: "0 0 32px" }}>
                Security reviews,<br />automated.
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { icon: "⬡", text: "AI-generated STRIDE threat modeling from source code" },
                  { icon: "◈", text: "Configurable multi-stage approval pipeline — Security, Legal, Team Lead" },
                  { icon: "◎", text: "Full audit trail — every version, every change, every reviewer" },
                  { icon: "◆", text: "Slack notifications in real time as stages complete" },
                ].map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ color: "#c2724f", fontSize: 14, marginTop: 1, flexShrink: 0 }}>{b.icon}</span>
                    <p style={{ fontSize: 14, color: "#44403c", lineHeight: 1.6, margin: 0 }}>{b.text}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            {/* right */}
            <Reveal delay={100} style={{ flex: 1, minWidth: 0 }}>
              <ReviewMockup />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: LIVE TOOLS (wow moment)
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ background: "#fff", padding: "96px 24px", borderTop: "1px solid #f0ece6" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#c2724f", margin: "0 0 14px" }}>Live tools</p>
            <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", color: "#1c1917", margin: "0 0 12px" }}>
              Every approved tool gets a live URL.
            </h2>
            <p style={{ fontSize: 15, color: "#78716c", margin: 0 }}>
              Fork for a client. Change the branding. Share the new URL. Two minutes.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="lp-live-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24, marginTop: 48 }}>
              <LiveTool toolId="80ff8582-2ed9-4bf7-ab2a-621622c08160" title="Client Health Dashboard" />
              <LiveTool toolId="1df38dc8-697d-4ca2-b3bd-b8f075269295" title="ACME Health Dashboard" />
            </div>
          </Reveal>
          <Reveal delay={120} style={{ textAlign: "center", marginTop: 32 }}>
            <a href="/api/auth/signin" style={{ fontSize: 14, color: "#c2724f", textDecoration: "none", fontWeight: 500 }}>
              Upload your first tool →
            </a>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: FEATURE GRID (dark)
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ background: "#07091a", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", margin: 0 }}>
              Everything you need. Nothing you don&apos;t.
            </h2>
          </Reveal>
          <div className="lp-feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { icon: "◈", title: "AI Security Docs", desc: "Auto-generated STRIDE threat models from code analysis. Reviewers get real context, not just a file name." },
              { icon: "⬡", title: "Live Serving",    desc: "Every approved tool gets a shareable URL. No uploads, no sends — a permanent link that always points to the latest version." },
              { icon: "◎", title: "Fork & Version",  desc: "V1 → V2 → V3 with full lineage. See every parent, every child. Fork for a customer, change a logo, share the URL." },
              { icon: "◆", title: "Multi-Stage Review", desc: "Security → Legal → Team Lead. Configurable per org. Custom questions per stage. Manager routing built in." },
              { icon: "▣", title: "Any File Type",   desc: "HTML tools, Python scripts, Jupyter notebooks, PDFs, Excel — ForkHub accepts and previews all of them." },
              { icon: "◇", title: "API-First",       desc: "Everything via REST API. Give Claude your API key and it uploads, submits, and fills out the security review autonomously." },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 40}>
                <div className="lp-feat-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ color: "#c2724f", fontSize: 14 }}>{f.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>{f.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: FINAL CTA
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{
        background: "linear-gradient(160deg, #0a0e1d 0%, #0f172a 60%, #1a1220 100%)",
        padding: "120px 24px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        {/* glow orb */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 400,
          background: "radial-gradient(ellipse, rgba(194,114,79,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <Reveal style={{ position: "relative" }}>
          <h2 style={{
            fontSize: 52, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.1,
            color: "#fff", margin: "0 auto 16px", maxWidth: 640,
          }}>
            Stop losing tools in<br />Downloads folders.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.32)", margin: "0 0 40px" }}>
            No credit card required. Works with any AI coding tool.
          </p>
          <a href="/api/auth/signin" className="lp-cta-btn" style={{ fontSize: 16, padding: "15px 36px" }}>
            Get Started — Free
          </a>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#07091a", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "28px 24px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "-0.01em" }}>The ForkHub</span>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              ["Getting Started", "/getting-started"],
              ["Browse Tools", "/browse"],
              ["Sign In", "/api/auth/signin"],
            ].map(([label, href]) => (
              <a key={label} href={href} style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
              >{label}</a>
            ))}
          </div>
        </div>
      </footer>
    </>
  )
}

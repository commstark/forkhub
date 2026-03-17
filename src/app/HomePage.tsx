"use client"

import { useEffect, useRef } from "react"

function useScrollReveal(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect() } },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
}

function RevealSection({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollReveal(ref as React.RefObject<HTMLElement>)
  return (
    <div ref={ref} className="scroll-reveal" style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

export default function HomePage() {
  return (
    <div style={{ background: "#faf8f5", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Inline marketing nav ─────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        background: "rgba(250,248,245,0.85)",
        borderBottom: "1px solid rgba(194,114,79,0.15)",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <span style={{ color: "#c2724f", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>
            The ForkHub
          </span>
          <a
            href="/api/auth/signin"
            style={{
              background: "#c2724f", color: "#fff", padding: "8px 18px", borderRadius: 6,
              textDecoration: "none", fontWeight: 600, fontSize: 14,
            }}
          >
            Sign In
          </a>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 740, margin: "0 auto", padding: "80px 24px 72px", textAlign: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#c2724f", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>
          For teams building with AI
        </p>
        <h1 style={{ fontSize: 44, fontWeight: 700, color: "#1c1917", letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 8px" }}>
          Your employees are building AI tools.
        </h1>
        <h2 style={{ fontSize: 38, fontWeight: 700, color: "#c2724f", letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 24px" }}>
          Where do those tools live?
        </h2>
        <p style={{ fontSize: 17, color: "#6b7280", lineHeight: 1.65, maxWidth: 580, margin: "0 auto 36px" }}>
          ForkHub is a secure, searchable library for tools your team builds.
          Upload, review, discover, and fork with a full security pipeline.
        </p>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <a
            href="/api/auth/signin"
            style={{
              display: "inline-block", background: "#c2724f", color: "#fff",
              padding: "14px 32px", borderRadius: 8, textDecoration: "none",
              fontWeight: 700, fontSize: 16, boxShadow: "0 4px 16px rgba(194,114,79,0.3)",
            }}
          >
            Get Started →
          </a>
          <a href="/getting-started" style={{ fontSize: 14, color: "#9ca3af", textDecoration: "none" }}>
            or read the Getting Started guide
          </a>
        </div>
      </section>

      {/* ── The Problem ──────────────────────────────────────────────── */}
      <RevealSection>
        <section style={{ background: "#fff", borderTop: "1px solid rgba(0,0,0,0.06)", borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "72px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c2724f", textAlign: "center", marginBottom: 12 }}>
              Without ForkHub
            </p>
            <h3 style={{ fontSize: 28, fontWeight: 700, color: "#1c1917", letterSpacing: "-0.02em", textAlign: "center", marginBottom: 40 }}>
              Sound familiar?
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
              {[
                {
                  icon: "📁",
                  title: "Lost in Downloads",
                  desc: "Tools live in personal folders, Slack messages, and Notion docs. Nobody knows what exists.",
                },
                {
                  icon: "🔓",
                  title: "No Security Review",
                  desc: "Tools touch customer data and internal systems with no audit trail and no approval process.",
                },
                {
                  icon: "👻",
                  title: "Builders Get No Credit",
                  desc: "The person who built the tool that everyone uses? Their name is nowhere.",
                },
              ].map((card) => (
                <div key={card.title} style={{
                  background: "#faf8f5", border: "1px solid #ebe5dd", borderRadius: 12,
                  padding: "28px 24px",
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{card.icon}</div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1c1917", margin: "0 0 8px" }}>{card.title}</h4>
                  <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <RevealSection>
        <section style={{ padding: "72px 24px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c2724f", textAlign: "center", marginBottom: 12 }}>
              How it works
            </p>
            <h3 style={{ fontSize: 28, fontWeight: 700, color: "#1c1917", letterSpacing: "-0.02em", textAlign: "center", marginBottom: 48 }}>
              From upload to your whole team
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
              {[
                { num: "1", title: "Upload", desc: "Use the API, Claude Code, or upload directly. Any file format works — HTML, Python, JSON, scripts." },
                { num: "2", title: "Review Prep", desc: "Claude reads your code and fills out the security questionnaire so reviewers have real context to work from." },
                { num: "3", title: "Team Approves", desc: "Your review stages route the tool to the right people in order. Each stage has its own approver." },
                { num: "4", title: "Team Discovers", desc: "Approved tools are searchable and forkable. Colleagues build on your work with your name attached." },
              ].map((step) => (
                <div key={step.num} style={{ textAlign: "center" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "rgba(194,114,79,0.1)", border: "2px solid #c2724f",
                    color: "#c2724f", fontWeight: 700, fontSize: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                  }}>
                    {step.num}
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: "#1c1917", margin: "0 0 8px" }}>{step.title}</h4>
                  <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── For IT & Security ────────────────────────────────────────── */}
      <RevealSection>
        <section style={{ background: "#fff", borderTop: "1px solid rgba(0,0,0,0.06)", borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "72px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c2724f", textAlign: "center", marginBottom: 12 }}>
              For security teams
            </p>
            <h3 style={{ fontSize: 28, fontWeight: 700, color: "#1c1917", letterSpacing: "-0.02em", textAlign: "center", marginBottom: 40 }}>
              Built with your IT team in mind
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {[
                { icon: "🔒", title: "Configurable Review Pipeline", desc: "Define stages, assign roles, set classification filters, and add custom questions per stage." },
                { icon: "📋", title: "Security Questionnaire", desc: "Claude reads the code and fills out the security doc before it reaches your team. Reviewers see real context." },
                { icon: "🏷️", title: "Classification Routing", desc: "Internal and customer-facing tools automatically go to the right review stages." },
                { icon: "📄", title: "Any File Format", desc: "HTML tools, Python scripts, JSON configs — ForkHub accepts and previews them all." },
                { icon: "🔑", title: "API-First", desc: "Full REST API for CI/CD integration. A Claude Code skill is included for direct uploads from the terminal." },
                { icon: "👥", title: "Role-Based Access", desc: "Members, reviewers, and admins each have scoped permissions." },
              ].map((feat) => (
                <div key={feat.title} style={{
                  display: "flex", gap: 16, padding: "20px 20px",
                  background: "#faf8f5", border: "1px solid #ebe5dd", borderRadius: 10,
                }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{feat.icon}</span>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: "#1c1917", margin: "0 0 4px" }}>{feat.title}</h4>
                    <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.55, margin: 0 }}>{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <RevealSection>
        <section style={{ padding: "80px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <h3 style={{ fontSize: 28, fontWeight: 700, color: "#1c1917", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
              Give your team&apos;s tools a home.
            </h3>
            <p style={{ fontSize: 15, color: "#9ca3af", margin: "0 0 32px" }}>Free to start. No credit card.</p>
            <a
              href="/api/auth/signin"
              style={{
                display: "inline-block", background: "#c2724f", color: "#fff",
                padding: "14px 36px", borderRadius: 8, textDecoration: "none",
                fontWeight: 700, fontSize: 16, boxShadow: "0 4px 16px rgba(194,114,79,0.3)",
              }}
            >
              Get Started →
            </a>
          </div>
        </section>
      </RevealSection>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid rgba(0,0,0,0.06)", padding: "28px 24px",
        textAlign: "center", background: "#faf8f5",
      }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 12, flexWrap: "wrap" }}>
          <a href="/getting-started" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>Getting Started</a>
          <a href="/browse" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>Browse Tools</a>
          <a href="/api/auth/signin" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>Sign In</a>
        </div>
        <p style={{ fontSize: 12, color: "#d1d5db", margin: "0 0 4px" }}>© 2025 The ForkHub</p>
        <p style={{ fontSize: 12, color: "#d1d5db", margin: 0 }}>A secure marketplace for your team&apos;s AI tools.</p>
      </footer>
    </div>
  )
}

"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <>
      <style>{`
        .login-split { display: flex; min-height: 100vh; }
        .login-left  { flex: 6; background: #f0ece6; padding: 64px 56px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
        .login-right { flex: 4; background: #f8f6f3; display: flex; align-items: center; justify-content: center; padding: 48px 40px; }
        .login-card-new {
          width: 100%; max-width: 360px;
          background: #fff; border: 1px solid #ebe5dd; border-radius: 14px;
          padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
        }
        .google-btn-new {
          display: flex; width: 100%; align-items: center; justify-content: center; gap: 10px;
          border: 1px solid #ebe5dd; border-radius: 9px; background: #fff;
          padding: 11px 16px; font-size: 14px; font-weight: 500; color: #1c1917;
          cursor: pointer; transition: background 0.15s, box-shadow 0.15s;
        }
        .google-btn-new:hover { background: #f8f6f3; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        @media (max-width: 768px) {
          .login-split  { flex-direction: column; }
          .login-left   { flex: none; padding: 48px 28px 36px; }
          .login-right  { flex: none; padding: 32px 24px 48px; }
          .login-left-brand { font-size: 36px !important; }
        }
      `}</style>

      <div className="login-split">

        {/* ── Left: marketing ── */}
        <div className="login-left">
          {/* Subtle geometric pattern */}
          <svg
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="geo" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="60" height="60" fill="none" />
                <circle cx="30" cy="30" r="1.5" fill="#e8e0d6" opacity="0.7" />
                <line x1="0" y1="60" x2="60" y2="0" stroke="#e8e0d6" strokeWidth="0.5" opacity="0.35" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#geo)" />
          </svg>

          {/* Back to home */}
          <Link
            href="/"
            style={{
              position: "absolute", top: 28, left: 40,
              fontSize: 13, color: "#c2724f", textDecoration: "none",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            ← Back to home
          </Link>

          {/* Content */}
          <div style={{ position: "relative", maxWidth: 480 }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a8a29e", margin: "0 0 20px" }}>
              The ForkHub
            </p>
            <h1
              className="login-left-brand"
              style={{
                fontSize: 52, fontWeight: 400, lineHeight: 1.1,
                letterSpacing: "-0.02em", color: "#1c1917",
                fontFamily: "var(--font-serif)", margin: "0 0 18px",
              }}
            >
              The <span style={{ color: "#c2724f", fontStyle: "italic" }}>hub</span> for<br />
              your team&apos;s AI tools.
            </h1>
            <p style={{ fontSize: 15, color: "#78716c", lineHeight: 1.65, margin: "0 0 36px", maxWidth: 380 }}>
              the github for humans — store, review, and share AI-built tools across your org.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                "Store and discover AI-built tools",
                "AI-generated security reviews on every upload",
                "Share live tools with clients in under a minute",
              ].map((b) => (
                <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 2, height: 18, background: "#c2724f", opacity: 0.5, flexShrink: 0, borderRadius: 1, marginTop: 3 }} />
                  <p style={{ margin: 0, fontSize: 14, color: "#a8a29e", lineHeight: 1.5 }}>{b}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: login card ── */}
        <div className="login-right">
          <div className="login-card-new">
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1c1917", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
                Sign in to your org
              </h2>
              <p style={{ fontSize: 13, color: "#a8a29e", margin: 0, lineHeight: 1.55 }}>
                Your org is auto-detected from your Google Workspace domain.
              </p>
            </div>

            <button
              className="google-btn-new"
              onClick={() => signIn("google", { callbackUrl: "/" })}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p style={{ margin: "20px 0 0", fontSize: 11, color: "#a8a29e", textAlign: "center", lineHeight: 1.55 }}>
              By signing in you agree to your org&apos;s usage policies.
            </p>
          </div>
        </div>

      </div>
    </>
  )
}

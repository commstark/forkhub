import Link from "next/link"

export default function NotFound() {
  return (
    <main className="page-narrow" style={{ textAlign: "center", paddingTop: 80 }}>
      <p style={{ fontSize: 48, margin: "0 0 8px", lineHeight: 1 }}>⑂</p>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-1)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
        Page not found
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-3)", margin: "0 0 24px" }}>
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/browse" className="btn btn-primary">Browse tools</Link>
        <Link href="/getting-started" className="btn btn-secondary">Getting started</Link>
      </div>
    </main>
  )
}

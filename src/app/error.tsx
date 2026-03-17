"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="page-narrow" style={{ textAlign: "center", paddingTop: 80 }}>
      <p style={{ fontSize: 48, margin: "0 0 8px", lineHeight: 1 }}>✕</p>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-1)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
        Something went wrong
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-3)", margin: "0 0 24px" }}>
        An unexpected error occurred. Try again or return to browse.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/browse" className="btn btn-secondary">Browse tools</Link>
      </div>
    </main>
  )
}

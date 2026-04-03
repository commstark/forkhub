"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"

export default function NavBar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!session || pathname.startsWith("/preview")) return null

  function linkClass(href: string) {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
    return `nav-link${active ? " active" : ""}`
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          <span>The Fork Hub</span>
          <span className="nav-brand-tagline">— the github for humans</span>
        </Link>
        <button
          className="nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? "\u2715" : "\u2630"}
        </button>
        <div className={`nav-links${menuOpen ? " open" : ""}`}>
          <Link href="/browse" className={linkClass("/browse")} onClick={() => setMenuOpen(false)}>Browse</Link>
          <Link href="/getting-started" className={linkClass("/getting-started")} onClick={() => setMenuOpen(false)}>Getting Started</Link>
          {(session.user.role === "reviewer" || session.user.role === "admin") && (
            <Link href="/review" className={linkClass("/review")} onClick={() => setMenuOpen(false)}>Review Queue</Link>
          )}
          {session.user.role === "admin" && (
            <Link href="/admin" className={linkClass("/admin")} onClick={() => setMenuOpen(false)}>Admin</Link>
          )}
          <Link href={`/profile/${session.user.id}`} className={linkClass("/profile")} onClick={() => setMenuOpen(false)}>My Profile</Link>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="nav-btn">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

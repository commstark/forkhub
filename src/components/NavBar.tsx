"use client"

import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"

export default function NavBar() {
  const { data: session } = useSession()
  const pathname = usePathname()

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
        <div className="nav-links">
          <Link href="/browse" className={linkClass("/browse")}>Browse</Link>
          <Link href="/getting-started" className={linkClass("/getting-started")}>Getting Started</Link>
          {(session.user.role === "reviewer" || session.user.role === "admin") && (
            <Link href="/review" className={linkClass("/review")}>Review Queue</Link>
          )}
          {session.user.role === "admin" && (
            <Link href="/admin" className={linkClass("/admin")}>Admin</Link>
          )}
          <Link href={`/profile/${session.user.id}`} className={linkClass("/profile")}>My Profile</Link>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="nav-btn">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

"use client"

import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import Link from "next/link"

export default function NavBar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let ticking = false
    function update() {
      const progress = Math.min(window.scrollY / 60, 1)
      if (navRef.current) {
        navRef.current.style.transform = `translateY(${-(progress * 7)}px)`
      }
      ticking = false
    }
    function onScroll() {
      if (!ticking) { requestAnimationFrame(update); ticking = true }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    update()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!session || pathname.startsWith("/preview")) return null

  function linkClass(href: string) {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
    return `nav-link${active ? " active" : ""}`
  }

  return (
    <nav ref={navRef} className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          <span>The Fork Hub</span>
          <span className="nav-brand-tagline">— the github for humans</span>
        </Link>
        <div className="nav-links">
          <Link href="/" className={linkClass("/")}>Browse</Link>
          <Link href="/review" className={linkClass("/review")}>Review Queue</Link>
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

"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function MyUploads() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status === "authenticated") { router.push(`/profile/${session.user.id}`) }
  }, [status, session, router])

  return <div className="loading-state">Redirecting…</div>
}

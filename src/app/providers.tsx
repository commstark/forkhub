"use client"

import { SessionProvider } from "next-auth/react"
import { useEffect } from "react"

function PullToReload() {
  useEffect(() => {
    let startY = 0
    let pulling = false

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY
        pulling = true
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (!pulling) return
      const delta = e.changedTouches[0].clientY - startY
      if (delta > 80) window.location.reload()
      pulling = false
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PullToReload />
      {children}
    </SessionProvider>
  )
}

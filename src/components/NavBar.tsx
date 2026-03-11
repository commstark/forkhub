"use client"

import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"

export default function NavBar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  if (!session || pathname.startsWith("/preview")) return null

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-2 flex items-center justify-end">
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-sm text-gray-400 hover:text-gray-700 transition"
      >
        Sign out
      </button>
    </div>
  )
}

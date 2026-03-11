"use client"

import { useSession, signOut } from "next-auth/react"

export default function NavBar() {
  const { data: session } = useSession()
  if (!session) return null

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-2 flex items-center justify-end gap-3">
      <span className="text-sm text-gray-500">{session.user.name}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-sm text-gray-400 hover:text-gray-700 transition"
      >
        Sign out
      </button>
    </div>
  )
}

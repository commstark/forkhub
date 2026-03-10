import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) redirect("/login")

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold text-gray-900">ForkHub</h1>
      <p className="text-gray-500">Signed in as <span className="font-medium text-gray-800">{session.user.email}</span></p>
      <p className="text-sm text-gray-400">Role: {session.user.role} · Org: {session.user.orgId}</p>
    </main>
  )
}

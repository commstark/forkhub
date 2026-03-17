import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function ProfileRedirect() {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    redirect(`/profile/${session.user.id}`)
  }
  redirect("/login")
}

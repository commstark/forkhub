import type { Metadata } from "next"
import { supabaseServer } from "@/lib/supabase-server"

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabaseServer
    .from("users")
    .select("name")
    .eq("id", params.id)
    .single()

  return {
    title: data?.name ?? "Profile",
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}

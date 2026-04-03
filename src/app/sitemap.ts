import type { MetadataRoute } from "next"
import { supabaseServer } from "@/lib/supabase-server"

const BASE = "https://www.theforkhub.net"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: tools }, { data: users }] = await Promise.all([
    supabaseServer
      .from("tools")
      .select("id, updated_at")
      .eq("status", "approved"),
    supabaseServer
      .from("users")
      .select("id, created_at"),
  ])

  const toolEntries: MetadataRoute.Sitemap = (tools ?? []).map((tool) => ({
    url: `${BASE}/tool/${tool.id}`,
    lastModified: tool.updated_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }))

  const profileEntries: MetadataRoute.Sitemap = (users ?? []).map((user) => ({
    url: `${BASE}/profile/${user.id}`,
    lastModified: user.created_at,
    changeFrequency: "monthly",
    priority: 0.3,
  }))

  return [
    {
      url: `${BASE}/`,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/login`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...toolEntries,
    ...profileEntries,
  ]
}

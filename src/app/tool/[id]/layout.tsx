import type { Metadata } from "next"
import { supabaseServer } from "@/lib/supabase-server"

type Props = {
  params: { id: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data } = await supabaseServer
    .from("tools")
    .select("title")
    .eq("id", params.id)
    .single()

  return {
    title: data?.title ?? "Tool",
  }
}

export default async function ToolLayout({ params, children }: Props) {
  const { data: tool } = await supabaseServer
    .from("tools")
    .select("title, description, category, rating_avg, rating_count, creator:users!creator_id(name)")
    .eq("id", params.id)
    .single()

  const jsonLd = tool
    ? {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: tool.title,
        description: tool.description,
        author: {
          "@type": "Person",
          name: (tool.creator as unknown as { name: string } | null)?.name ?? "Unknown",
        },
        applicationCategory: tool.category,
        ...(tool.rating_count > 0 && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: tool.rating_avg,
            ratingCount: tool.rating_count,
          },
        }),
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  )
}

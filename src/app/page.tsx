import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import HomePage from "./HomePage"

const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "The Fork Hub",
  description:
    "The corporate marketplace for AI-generated internal tools. Upload, review, share, and fork employee-built tools with built-in security reviews.",
  url: "https://www.theforkhub.net",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
}

export default async function RootPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/browse")
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <HomePage />
    </>
  )
}

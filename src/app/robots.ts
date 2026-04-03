import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/review/", "/live/"],
    },
    sitemap: "https://www.theforkhub.net/sitemap.xml",
  }
}

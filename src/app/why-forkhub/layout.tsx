import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Why The Fork Hub? — Shadow AI Governance for the Enterprise",
  description:
    "Your employees are building tools with AI. The Fork Hub gives you a governed marketplace with security reviews, version control, and builder credit.",
}

export default function WhyForkHubLayout({ children }: { children: React.ReactNode }) {
  return children
}

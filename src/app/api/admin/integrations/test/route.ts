import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

type CustomConfig = {
  integrations?: {
    slack?: { webhook_url?: string }
    linear?: { api_key?: string; project_id?: string }
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { type } = await request.json()

  const { data } = await supabaseServer
    .from("orgs").select("custom_config").eq("id", session.user.orgId).single()
  const config: CustomConfig = (data as { custom_config?: CustomConfig } | null)?.custom_config ?? {}

  if (type === "slack") {
    const url = config.integrations?.slack?.webhook_url
    if (!url) return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 400 })
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "✅ ForkHub integration test — connected successfully." }),
      })
      if (!res.ok) return NextResponse.json({ error: `Slack returned ${res.status}` }, { status: 400 })
      return NextResponse.json({ success: true, message: "Test message sent to Slack" })
    } catch (e) {
      return NextResponse.json({ error: `Request failed: ${(e as Error).message}` }, { status: 500 })
    }
  }

  if (type === "linear") {
    const key = config.integrations?.linear?.api_key
    if (!key) return NextResponse.json({ error: "Linear API key not configured" }, { status: 400 })
    try {
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: { "Authorization": key, "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ viewer { id name } }" }),
      })
      const json = await res.json()
      if (json.errors) return NextResponse.json({ error: json.errors[0]?.message ?? "Linear auth failed" }, { status: 400 })
      return NextResponse.json({ success: true, message: `Connected as ${json.data?.viewer?.name ?? "unknown"}` })
    } catch (e) {
      return NextResponse.json({ error: `Request failed: ${(e as Error).message}` }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Unknown integration type. Use slack or linear." }, { status: 400 })
}

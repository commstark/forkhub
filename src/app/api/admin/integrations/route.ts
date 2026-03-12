import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"

// NOTE: requires custom_config JSONB column on orgs table.
// Run in Supabase SQL editor if not present:
//   ALTER TABLE orgs ADD COLUMN IF NOT EXISTS custom_config JSONB DEFAULT '{}';

type CustomConfig = {
  integrations?: {
    slack?: { webhook_url?: string }
    linear?: { api_key?: string; project_id?: string }
  }
  custom_vars?: Record<string, string>
}


async function getConfig(orgId: string): Promise<CustomConfig> {
  const { data } = await supabaseServer
    .from("orgs").select("custom_config").eq("id", orgId).single()
  return (data as { custom_config?: CustomConfig } | null)?.custom_config ?? {}
}

export async function GET(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const config = await getConfig(auth.user.orgId)
  return NextResponse.json(config)
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const config = await getConfig(auth.user.orgId)

  // Merge update
  if (body.integration === "slack") {
    config.integrations = { ...config.integrations, slack: { webhook_url: body.webhook_url } }
  } else if (body.integration === "linear") {
    config.integrations = { ...config.integrations, linear: { api_key: body.api_key, project_id: body.project_id } }
  } else if (body.integration === "custom") {
    config.custom_vars = config.custom_vars ?? {}
    if (body.delete) {
      delete config.custom_vars[body.key]
    } else {
      config.custom_vars[body.key] = body.value
    }
  } else {
    return NextResponse.json({ error: "Unknown integration type" }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from("orgs").update({ custom_config: config }).eq("id", auth.user.orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAuditLog({
    orgId: auth.user.orgId, userId: auth.user.id,
    action: "org.integrations_updated", targetType: "org", targetId: auth.user.orgId,
    metadata: { integration: body.integration },
  })

  return NextResponse.json({ success: true, config })
}

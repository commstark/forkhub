import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
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

function maskValue(val: string): string {
  if (!val || val.length <= 4) return "****"
  return "****" + val.slice(-4)
}

function maskConfig(config: CustomConfig): CustomConfig {
  const masked: CustomConfig = { ...config, integrations: {}, custom_vars: {} }
  const integ = config.integrations ?? {}
  if (integ.slack?.webhook_url) {
    masked.integrations!.slack = { webhook_url: maskValue(integ.slack.webhook_url) }
  }
  if (integ.linear?.api_key || integ.linear?.project_id) {
    masked.integrations!.linear = {
      api_key:    integ.linear.api_key    ? maskValue(integ.linear.api_key)    : undefined,
      project_id: integ.linear.project_id ? maskValue(integ.linear.project_id) : undefined,
    }
  }
  for (const [k, v] of Object.entries(config.custom_vars ?? {})) {
    masked.custom_vars![k] = maskValue(v)
  }
  return masked
}

async function getConfig(orgId: string): Promise<CustomConfig> {
  const { data } = await supabaseServer
    .from("orgs").select("custom_config").eq("id", orgId).single()
  return (data as { custom_config?: CustomConfig } | null)?.custom_config ?? {}
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const config = await getConfig(session.user.orgId)
  return NextResponse.json(maskConfig(config))
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const config = await getConfig(session.user.orgId)

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
    .from("orgs").update({ custom_config: config }).eq("id", session.user.orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAuditLog({
    orgId: session.user.orgId, userId: session.user.id,
    action: "org.integrations_updated", targetType: "org", targetId: session.user.orgId,
    metadata: { integration: body.integration },
  })

  return NextResponse.json({ success: true, config: maskConfig(config) })
}

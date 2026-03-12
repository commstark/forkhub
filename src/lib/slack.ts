import "server-only"
import { supabaseServer } from "@/lib/supabase-server"

async function getWebhookUrl(orgId: string): Promise<string | null> {
  const { data } = await supabaseServer
    .from("orgs")
    .select("custom_config")
    .eq("id", orgId)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.custom_config?.integrations?.slack?.webhook_url ?? null
}

/**
 * Fire-and-forget Slack notification.
 * Never awaited — never throws — never blocks the main request.
 */
export function notifySlack(orgId: string, payload: object): void {
  getWebhookUrl(orgId)
    .then((url) => {
      if (!url) return
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {})
    })
    .catch(() => {})
}

const base = process.env.NEXTAUTH_URL ?? ""

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSecurityFields(doc: Record<string, any> | null) {
  return {
    risk_level:           doc?.functional_risk_assessment?.risk_level ?? "",
    recommendation:       doc?.threat_statement_summary?.approval_recommendation ?? "",
    key_concerns:         (doc?.threat_statement_summary?.key_concerns as string[] | undefined)?.join(", ") ?? "",
    external_integrations: doc?.application_description?.key_characteristics?.external_integrations ?? "",
  }
}

export const slackMessages = {
  submitted: (
    title: string,
    creator: string,
    classification: string,
    reviewId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    securityDoc: Record<string, any> | null = null
  ) => ({
    title,
    creator,
    classification,
    status: "Submitted for review",
    notes: "",
    url: `${base}/review/${reviewId}`,
    review_url: `${base}/review/${reviewId}`,
    ...extractSecurityFields(securityDoc),
  }),

  approved: (title: string, creator: string, classification: string, notes: string | null, toolId: string) => ({
    title,
    creator,
    classification,
    status: "Approved",
    notes: notes ?? "",
    url: `${base}/tool/${toolId}`,
  }),

  rejected: (title: string, creator: string, classification: string, notes: string) => ({
    title,
    creator,
    classification,
    status: "Rejected",
    notes,
    url: "",
  }),

  changesRequested: (title: string, creator: string, classification: string, notes: string) => ({
    title,
    creator,
    classification,
    status: "Changes requested",
    notes,
    url: "",
  }),
}

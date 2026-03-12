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

export const slackMessages = {
  submitted: (title: string, creatorName: string, classification: string, fileType: string) => ({
    text: "🔍 New tool submitted for review",
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*New Tool for Review*\n*Title:* ${title}\n*Creator:* ${creatorName}\n*Classification:* ${classification}\n*Type:* ${fileType}\n\n<${base}/review|View in Review Queue>`,
      },
    }],
  }),

  approved: (title: string, reviewerName: string, notes: string | null, toolId: string) => ({
    text: "✅ Tool approved",
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `✅ *Tool Approved*\n*Title:* ${title}\n*Reviewer:* ${reviewerName}\n*Notes:* ${notes ?? "—"}\n\n<${base}/tool/${toolId}|View Tool>`,
      },
    }],
  }),

  rejected: (title: string, reviewerName: string, notes: string) => ({
    text: "❌ Tool rejected",
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `❌ *Tool Rejected*\n*Title:* ${title}\n*Reviewer:* ${reviewerName}\n*Reason:* ${notes}`,
      },
    }],
  }),

  changesRequested: (title: string, reviewerName: string, notes: string) => ({
    text: "🔄 Changes requested",
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🔄 *Changes Requested*\n*Title:* ${title}\n*Reviewer:* ${reviewerName}\n*Feedback:* ${notes}`,
      },
    }],
  }),
}

import "server-only"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev"

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({ from: `The ForkHub <${FROM}>`, to, subject, html })
  } catch (err) {
    console.error("[email] failed to send:", subject, err)
  }
}

// ─── Base layout ─────────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h2 style="color:#c2724f;margin:0 0 24px;font-size:18px;font-weight:700;text-decoration:none;">The ForkHub</h2>
    <div style="color:#374151;line-height:1.6;font-size:15px;">
      ${content}
    </div>
    <p style="font-size:12px;color:#9ca3af;margin-top:32px;">The ForkHub — Your team's AI tool library.</p>
  </div>
</body>
</html>`.trim()
}

function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#c2724f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">${text}</a>`
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function welcomeEmail(name: string): string {
  return baseLayout(`
    <p>Welcome to The ForkHub, ${name}.</p>
    <p>ForkHub is your team's internal marketplace for AI tools — upload, discover, fork, and build on tools your colleagues create. Every tool goes through a security review before it's shared with the team.</p>
    <p>You're all set to start exploring. Check out what your teammates have already built:</p>
    ${ctaButton("Explore The ForkHub →", `${process.env.NEXTAUTH_URL ?? ""}/browse`)}
    <p>Or read the <a href="${process.env.NEXTAUTH_URL ?? ""}/getting-started" style="color:#c2724f;">Getting Started guide</a> to learn how it works.</p>
  `)
}

export function toolSubmittedEmail(opts: {
  reviewerEmail: string
  toolTitle: string
  classification: string
  stageName: string
  reviewUrl: string
}): string {
  return baseLayout(`
    <p>A new tool has been submitted for your review.</p>
    <p>
      <strong>Tool:</strong> ${opts.toolTitle}<br>
      <strong>Classification:</strong> ${opts.classification.replace(/_/g, " ")}<br>
      <strong>Stage:</strong> ${opts.stageName}
    </p>
    <p>Review the security documentation and make your decision.</p>
    ${ctaButton("Review Now →", opts.reviewUrl)}
  `)
}

export function stageAdvancedEmail(opts: {
  reviewerEmail: string
  toolTitle: string
  stageName: string
  approvedByName: string
  reviewUrl: string
}): string {
  return baseLayout(`
    <p>A tool has advanced to your review stage.</p>
    <p><strong>${opts.toolTitle}</strong> was approved at the previous stage by ${opts.approvedByName} and is now ready for <strong>${opts.stageName}</strong>.</p>
    <p>Please review the security documentation and make your decision.</p>
    ${ctaButton("Review Now →", opts.reviewUrl)}
  `)
}

export function toolApprovedEmail(opts: {
  creatorEmail: string
  toolTitle: string
  toolUrl: string
  liveUrl: string | null
}): string {
  return baseLayout(`
    <p>Great news — <strong>${opts.toolTitle}</strong> has passed all review stages and is now live on ForkHub.</p>
    <p>Your teammates can discover and fork it from the browse page.</p>
    ${opts.liveUrl ? `<p>It's also accessible via a shareable live URL: <a href="${opts.liveUrl}" style="color:#c2724f;">${opts.liveUrl}</a></p>` : ""}
    ${ctaButton("View Your Tool →", opts.toolUrl)}
    ${opts.liveUrl ? `<p style="font-size:13px;color:#6b7280;">Live URL: <a href="${opts.liveUrl}" style="color:#c2724f;">${opts.liveUrl}</a></p>` : ""}
  `)
}

export function toolRejectedEmail(opts: {
  creatorEmail: string
  toolTitle: string
  stageName: string
  reviewerName: string
  notes: string
  resubmitSuggestion: string
}): string {
  return baseLayout(`
    <p>Your tool <strong>${opts.toolTitle}</strong> was not approved at the <strong>${opts.stageName}</strong> stage by ${opts.reviewerName}.</p>
    <p>Their notes: &ldquo;${opts.notes}&rdquo;</p>
    <p>You can address the feedback and resubmit. Once you've made changes, use POST /api/tools/{id}/resubmit to re-enter the review pipeline.</p>
    ${ctaButton("View Review →", opts.resubmitSuggestion)}
  `)
}

export function changesRequestedEmail(opts: {
  creatorEmail: string
  toolTitle: string
  stageName: string
  reviewerName: string
  notes: string
  reviewUrl: string
}): string {
  return baseLayout(`
    <p>${opts.reviewerName} has requested changes to <strong>${opts.toolTitle}</strong> at the <strong>${opts.stageName}</strong> stage.</p>
    <p>Their feedback: &ldquo;${opts.notes}&rdquo;</p>
    <p>Update your tool and resubmit to continue through the review pipeline.</p>
    ${ctaButton("View Feedback →", opts.reviewUrl)}
  `)
}

export function toolForkedEmail(opts: {
  originalCreatorEmail: string
  toolTitle: string
  forkerName: string
  forkTitle: string
  forkUrl: string
}): string {
  return baseLayout(`
    <p>Your tool <strong>${opts.toolTitle}</strong> was forked by ${opts.forkerName}, who created <strong>${opts.forkTitle}</strong>.</p>
    <p>When someone forks your tool, it means they found it useful enough to build on — nice work.</p>
    ${ctaButton("View Fork →", opts.forkUrl)}
  `)
}

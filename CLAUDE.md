# CLAUDE.md — The Fork Hub

Read this before every task. This is the source of truth for the project.

## What This Is

The Fork Hub — a corporate internal tool marketplace. Employees store, discover, fork, and build on AI-generated tools with security reviews, org permissions, and builder credit.

- **Brand name:** Always "The Fork Hub" (three words, with spaces)
- **Production:** www.theforkhub.net
- **Repo:** github.com/commstark/forkhub
- **Supabase:** qdnteqowyceqrwzztpbn.supabase.co

## Architecture

- Next.js 14 App Router, TypeScript, vanilla CSS (not Tailwind)
- Supabase (Postgres) — multi-tenant, every record scoped by org_id
- NextAuth.js — Google OAuth
- Deployed on Vercel
- Email notifications via Resend

## Critical: API-First Design

- **There is NO upload button in the web UI.** All uploads and forks happen via API (curl, AI coding tools, MCP)
- The web UI is view-only — an "interactive museum" for browsing, previewing, and reviewing
- Review approval UI is in the browser (reviewers are a different persona from builders)

## Auth Model (getAuth)

`src/lib/getAuth.ts` handles all authentication. Order matters:

1. **First:** Check `Authorization: Bearer sk_fh_...` header → SHA-256 hash → look up in `api_keys` table → resolve user
2. **Second (fallback):** Check NextAuth session cookie via `getServerSession`
3. **If Bearer token is present but invalid → return null immediately.** Never fall through to cookie auth on a bad API key. The two auth paths are fully isolated.

Both paths return the same shape: `{ user: { id, orgId, role, email, name } }`

## Classification System

Set at upload time. Determines security review routing:

- `internal_noncustomer` → auto-approved, no review
- `internal_customer` → security review required
- `external_customer` → security review required

The AI agent is the security gatekeeper for both classification and change_type.

## Fork / Update Model

- No separate update endpoint. To update a tool, fork your own tool (creates V2, V3, etc.)
- `change_type: minor_change` = cosmetic only (CSS, labels) → auto-approved
- `change_type: major_change` = functionality, data, APIs → review if customer-facing
- Never downgrade major → minor. Default to major if unsure.

## Security Doc

Auto-filled by AI on upload based on classification tier. Uses STRIDE threat modeling. See SKILL.md for the full JSON schema. Security doc is mandatory for `internal_customer` and `external_customer` uploads.

## Design System

- Warm off-white background: `#f8f6f3`
- White cards
- Copper accent: `#c2724f`
- **No dark navy** — explicitly rejected
- Font: DM Sans
- Clean, warm, professional. Not "2010 and cheap."

## Key Conventions

- Multi-tenant: org_id on every DB record, row-level security in Supabase
- File storage: Supabase Storage bucket `tool-files`, path `{org_id}/{tool_id}/{filename}`
- No quality gate — security review is the only gate, no auto-rejection
- All file formats accepted (HTML, Python, JS, CSV, etc.)
- Live tool serving at `/live/[id]` — full-screen, no Fork Hub UI
- Sharing modes: private (org only), link (anyone with URL), public

## Build & Deploy Rules

- **ALWAYS run `npm run build` locally before declaring a feature done.** Vercel runs `tsc` during build — if there are TypeScript errors, the deploy silently fails and production stays frozen on the last successful build. Next.js dev mode (`npm run dev`) does NOT catch type errors.
- **Check Vercel Deployments tab** (not just the project status) to confirm builds are succeeding. A "Ready" project can still have recent failed deploys.
- **Production domain is www.theforkhub.net** — never use placeholder domains like `yourorg.forkhub.com` in docs or examples.
- All example curl commands in docs MUST include every required field (title, description, category, classification, file).

## Key Files

- `SKILL.md` — AI agent instructions for interacting with The Fork Hub API
- `CLAUDE.md` — This file. Project context for Claude Code sessions.
- `src/lib/getAuth.ts` — Auth logic (API key first, session cookie fallback)
- `src/lib/security-doc.ts` — AI-generated security questionnaire
- `src/lib/review-pipeline.ts` — Multi-stage configurable review routing
- `src/lib/slack.ts` — Slack webhook notifications
- `src/lib/email.ts` — Resend email notifications (7 email types)
- `mcp-server/` — MCP server for native Claude integration (10 tools)

## Known Gotchas

- **TypeScript errors silently block deploys.** Dev mode won't catch them. Always `npm run build` before pushing.
- The QA Reviewer test account (`qa-reviewer@test.local`) was created directly in the DB — cannot use Google OAuth login
- Session tokens expire — always test API endpoints with Bearer API keys, not session cookies
- Supabase free tier auto-pauses after a week of inactivity — if everything 504s, check if the project is paused
- `search_vector` column must be populated for search to work — check it if search returns empty results
- Vercel serverless functions have a 10s timeout on Hobby, 60s on Pro
- The upload endpoint is `/api/tools/upload` (no trailing s) — `/api/tools/uploads` will 405
- Search route had a bug where an RPC error early-returned before the ilike fallback — fixed, but watch for similar patterns

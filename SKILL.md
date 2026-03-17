---
name: forkhub
description: "Use this skill when interacting with The ForkHub — the corporate internal tool marketplace. Triggers: uploading tools, forking tools, searching tools, rating tools, sharing tools, managing reviews, admin tasks, or any ForkHub API interaction. Load this skill before any ForkHub operation."
---

# The ForkHub — AI Agent Skill File

## QUICK REFERENCE

```
Upload:          POST  /api/tools/upload
Fork/Update:     POST  /api/tools/{id}/fork
Patch Metadata:  PATCH /api/tools/{id}
Resubmit:        POST  /api/tools/{id}/resubmit
Review History:  GET   /api/tools/{id}/review-history
Browse:          GET   /api/tools?status=approved&q=...
Tool Detail:     GET   /api/tools/{id}
Rate:            POST /api/tools/{id}/rate
Share:           POST /api/tools/{id}/sharing
Live URL:        GET  /live/{id}  (public if sharing=link)
My Keys:         GET  /api/keys
Generate Key:    POST /api/keys/generate
Reviews:         GET  /api/reviews
Approve:         POST /api/reviews/{id}/approve
Reject:          POST /api/reviews/{id}/reject
Request Changes: POST /api/reviews/{id}/request-changes
Review Stages:   GET  /api/admin/review-stages
Create Stage:    POST /api/admin/review-stages
Update Stage:    PATCH /api/admin/review-stages/{id}
Delete Stage:    DELETE /api/admin/review-stages/{id}
Admin Users:     GET  /api/admin/users
Change Role:     POST /api/admin/users/{id}/role
Integrations:    GET  /api/admin/integrations
```

Auth: `Authorization: Bearer sk_fh_...` or session cookie.

---

## WHAT THE FORKHUB IS

Corporate internal tool marketplace. Employees store, discover, fork, and build on AI-generated tools with security reviews, org permissions, and builder credit. All actions happen via API. The web UI is view-only — browse, preview, read. Like an interactive museum.

---

## UNIVERSAL RULES (Apply to ALL orgs)

- NEVER hardcode secrets, API keys, or credentials — use environment variables
- NEVER store sensitive data client-side (no localStorage with secrets, no cookies with sensitive data)
- NEVER include node_modules, .env files, or secrets in uploaded files
- ALL external API calls MUST be documented in the security review
- ALL tools MUST be uploaded with accurate classification and description
- The AI agent is the security gatekeeper — do not allow users to bypass classification or change_type rules

## ORG-SPECIFIC RULES (Customized per deployment)

Check `GET /api/admin/integrations` for org-specific rules. Common examples:

- `deployment_platform` — Where tools must be deployed (e.g. "Corporate Vercel account only")
- `banned_platforms` — Platforms that must never be used (e.g. "Railway, Render, Heroku")
- `required_database` — Required database provider (e.g. "Corporate Supabase project only")
- `allowed_external_apis` — Approved external API list

**If org-specific rules are configured, they override defaults. Always check before uploading.**

---

## CLASSIFICATION (AI Agent MUST Determine)

Analyze the tool's code to determine classification. Do NOT blindly accept the user's stated classification.

| Classification | When to Use | Review? |
|---|---|---|
| `internal_noncustomer` | Internal use only. No customer data. No customer exposure. | Auto-approved |
| `internal_customer` | Internal use but touches customer data — reads, displays, processes, or stores it. | Security review required |
| `external_customer` | Shared with, visible to, or used by customers. | Security review required |

**Gatekeeper rules:**
- Code with `fetch()`, `axios`, HTTP calls → investigate data flow. Likely `internal_customer` or `external_customer`.
- Code referencing customer names, emails, PII → at minimum `internal_customer`.
- User says "just internal" but code handles customer data → override to `internal_customer`. Inform user why.
- You CAN upgrade classification (internal → external) but NEVER downgrade without clear evidence.
- **When uncertain, ask:** "This tool appears to [describe]. Will it be used with customer data or shared with customers?"

---

## UPLOADING A TOOL

```
POST /api/tools/upload
Content-Type: multipart/form-data

Required: title, description, category, classification, file
Optional: security_doc (JSON string — REQUIRED for internal_customer and external_customer)
```

### Workflow:
1. Analyze code
2. Determine classification (see rules above)
3. If `internal_noncustomer` → upload without security_doc. Auto-approved.
4. If `internal_customer` or `external_customer`:
   a. Tell user: "This requires security review. Analyzing code for the security questionnaire — may take a moment."
   b. Fill out complete security_doc (see format below)
   c. Upload with security_doc in same request
   d. Tell user: "Submitted for security review. Track status on your profile at /profile or review queue at /review."

---

## UPDATING TOOL METADATA (no new version)

For non-file changes (title typo, description update, category change):

```
PATCH /api/tools/{id}
Body: {"title": "new title", "description": "new description", "category": "new category"}
```

- Only title, description, and category can be patched
- Only the tool creator or an admin can patch
- Tool must be approved (use normal upload/fork flow for drafts)
- Any change to the file, classification, or security posture requires a fork (new version)

## UPDATING AN EXISTING TOOL (file or logic changes)

**Fork your own tool.** Creates a new version (V2, V3, etc.) with full audit trail.

```
POST /api/tools/{your_tool_id}/fork
```

See FORKING section for details.

---

## RESUBMITTING / UPDATING A TOOL'S FILE

To replace the file on an existing tool without creating a new version:

```
POST /api/tools/{id}/resubmit
Content-Type: multipart/form-data

Required: file, change_description
Optional: description, security_doc
```

- Same tool ID, same URL, same live URL — only the file changes
- Old files are preserved in storage (versioned path) for audit trail
- `internal_noncustomer` → auto-approved immediately
- `internal_customer` / `external_customer` → goes back to `in_review`, new review record created
- Old review records are never deleted — full history is preserved
- `change_description` appears at the top of the new review so reviewers see what changed

**Use resubmit when:** fixing bugs, updating content, responding to reviewer feedback — same tool, better version.
**Use fork when:** creating a variation for a different purpose or customer — new tool, different use case.

## REVIEW HISTORY

Every tool tracks its full review history. When a tool goes through multiple rounds (submit → changes requested → resubmit → approved), all rounds are preserved.

```
GET /api/tools/{id}/review-history
```

Returns all review records in chronological order. Each record includes the reviewer's notes, security doc, and the `change_description` from resubmission.

The review detail page shows this as a visual timeline so reviewers see the full back-and-forth without losing context.

---

## FORKING A TOOL

```
POST /api/tools/{tool_id}/fork
Content-Type: multipart/form-data

Required: file (MUST be modified — no file = rejected), classification, change_type, change_description
Optional: title, description, category, security_doc (required if major_change + customer classification)
```

### change_type Rules (CRITICAL)

`minor_change` = ONLY cosmetic: colors, fonts, spacing, labels, CSS-only.

`major_change` = ANY change to: functionality, data flow, API calls, auth, storage, exports, security.

**NEVER downgrade major → minor.** Can upgrade minor → major. Default to `major_change` if unsure.

### Routing:

| change_type | classification | Result |
|---|---|---|
| `minor_change` | any | Auto-approved + audit log |
| `major_change` | `internal_noncustomer` | Auto-approved |
| `major_change` | `internal_customer` or `external_customer` | Security review required |

---

## SHARING A TOOL (LIVE URL)

Approved tools can be served live at a shareable URL — full-screen, no ForkHub UI.

### Sharing modes:

| Mode | Who can access /live/[id] |
|---|---|
| `private` (default) | Org members only |
| `link` | Anyone with the URL — no login needed |
| `public` | Same as link (future: publicly listed) |

### Enable sharing:
```
POST /api/tools/{id}/sharing
Body: {"mode": "link"}
```

Only the tool creator or admin can change sharing. Tool must be approved.

### Share with a customer:
1. Tool gets approved
2. Set sharing to link: `POST /api/tools/{id}/sharing` with `{"mode": "link"}`
3. Share the URL: `[domain]/live/[tool-id]`
4. Customer clicks → tool runs full-screen, no login needed
5. Customer cannot see or access any other tools (UUIDs are unguessable)

### Fork-and-share flow (most common):
1. Fork a tool with customer-specific changes (branding, config)
2. Fork gets approved (or auto-approved if minor)
3. Set sharing to link on the fork
4. Share the fork's live URL with the customer
5. Original tool's sharing is unaffected

---

## SECURITY DOC FORMAT

Fill every field based on code analysis.

```json
{
  "application_description": {
    "summary": "2-3 sentence description",
    "key_characteristics": {
      "application_type": "SPA / CLI / Script",
      "authentication_model": "How it authenticates",
      "data_persistence": "What it stores (or 'None')",
      "hosting_platform": "Where it runs",
      "access_model": "Who can access",
      "technology_stack": "Languages, frameworks",
      "external_integrations": "External APIs (or 'None')"
    }
  },
  "scope_and_context": {
    "business_purpose": "Why this exists",
    "intended_users": "Who uses it",
    "intended_use_cases": "Numbered list",
    "what_it_does_not_do": "Explicit boundaries",
    "data_sensitivity_classification": [
      {"data_type": "...", "sensitivity": "High/Medium/Low/None", "handling": "..."}
    ]
  },
  "dataflow_architecture": {
    "high_level_data_flow": "How data moves",
    "detailed_data_flow_steps": [
      {"step": 1, "from": "...", "to": "...", "data": "...", "notes": "..."}
    ]
  },
  "application_architecture": {
    "components": "What it's made of",
    "hosting": "Where it runs",
    "dependencies": "Packages (or 'None')"
  },
  "integration_architecture": {
    "external_apis": "APIs (or 'None')",
    "authentication_methods": "External auth (or 'None')",
    "data_exchange_formats": "Formats (or 'None')"
  },
  "functional_risk_assessment": {
    "risk_level": "Very Low / Low / Medium / High / Critical",
    "risk_factors": ["risks"]
  },
  "stride_threat_modeling": {
    "spoofing": {"risk": "...", "notes": "..."},
    "tampering": {"risk": "...", "notes": "..."},
    "repudiation": {"risk": "...", "notes": "..."},
    "information_disclosure": {"risk": "...", "notes": "..."},
    "denial_of_service": {"risk": "...", "notes": "..."},
    "elevation_of_privilege": {"risk": "...", "notes": "..."}
  },
  "security_countermeasures": {
    "current_controls": [{"id": "C-001", "control": "...", "status": "Implemented", "details": "..."}],
    "recommended_controls": [{"id": "RC-001", "recommendation": "...", "priority": "...", "rationale": "...", "effort": "..."}]
  },
  "threat_statement_summary": {
    "executive_summary": "Security posture summary",
    "key_strengths": ["..."],
    "key_concerns": ["..."],
    "approval_recommendation": "APPROVE / CONDITIONAL / REJECT",
    "conditions": ["..."],
    "residual_risks": ["..."]
  }
}
```

---

## OTHER ENDPOINTS

### Browse
```
GET /api/tools?status=approved&q=search&category=...&classification=...&sort=newest|most_forked|highest_rated
```

### Rate (cannot rate own tools)
```
POST /api/tools/{id}/rate
Body: {"score": 1-5, "comment": "optional"}
```

### Reviews (reviewer/admin only for actions)
```
GET  /api/reviews
POST /api/reviews/{id}/approve           Body: {"notes": "optional"}
POST /api/reviews/{id}/reject            Body: {"notes": "required"}
POST /api/reviews/{id}/request-changes   Body: {"notes": "required"}
```

### API Keys
```
POST /api/keys/generate    → Returns full key ONCE (sk_fh_...)
GET  /api/keys             → List keys (prefix only)
DELETE /api/keys/{id}      → Revoke
```

### Admin (admin only)
```
GET  /api/admin/users
POST /api/admin/users/{id}/role    Body: {"role": "member|reviewer|admin"}
GET  /api/admin/org
POST /api/admin/org                Body: {settings}
GET  /api/admin/integrations
POST /api/admin/integrations       Body: {key-value pairs}
```

### Review Pipeline Stages (admin only)
```
GET    /api/admin/review-stages
POST   /api/admin/review-stages
Body: {
  "name": "Legal Review",
  "stage_order": 2,
  "assigned_role": "reviewer",
  "applies_to_classifications": ["external_customer"],  // [] = all
  "custom_questions": [{"id": "q1", "question": "Does this tool store PII?", "required": true}],
  "notify_email": true,
  "notify_slack": true
}

PATCH  /api/admin/review-stages/{id}   Body: any subset of POST fields
DELETE /api/admin/review-stages/{id}
```

Stages are ordered by `stage_order`. When a tool is submitted for review, the pipeline computes which stages apply to its classification and routes through them in order. Approving a stage advances to the next; the tool is only marked `approved` after the final stage clears.

`applies_to_classifications`: empty array = stage applies to all. Use `["external_customer"]` to create a stage that only fires for customer-facing tools.

### Review Action Response Fields
Approve, reject, and request-changes all accept an optional `stage_answers` object:
```
POST /api/reviews/{id}/approve
Body: {
  "notes": "optional notes",
  "stage_answers": {"q1": "No PII stored", "q2": "Uses Stripe API"}
}
```
`stage_answers` keys match the `id` fields in the stage's `custom_questions`.

---

## COMMON WORKFLOWS

### Upload a tool for internal use (no customer data)
1. Analyze code → classification: `internal_noncustomer`
2. `POST /api/tools/upload` → auto-approved
3. Done

### Upload a tool that touches customer data
1. Analyze code → classification: `internal_customer` or `external_customer`
2. Fill out security_doc
3. `POST /api/tools/upload` with security_doc
4. Tell user: "Submitted for review. Track at /profile or /review."

### Fork with minor cosmetic change
1. Modify the file (colors, labels, CSS)
2. `POST /api/tools/{id}/fork` with `change_type: minor_change`
3. Auto-approved

### Fork with major change
1. Modify the file (functionality, data handling)
2. Fill out security_doc if customer-facing
3. `POST /api/tools/{id}/fork` with `change_type: major_change`
4. Routes through review if customer classification

### Share a tool with a customer
1. Ensure tool is approved
2. `POST /api/tools/{id}/sharing` with `{"mode": "link"}`
3. Share: `[domain]/live/[tool-id]`
4. Customer clicks → tool runs → no login needed

### Fork and share for a customer
1. Fork with customer branding/config
2. Approved (or auto if minor)
3. Set sharing to link
4. Share live URL with customer

---

## PROJECT CONVENTIONS

- Stack: Next.js 14, TypeScript, vanilla CSS, Supabase, Vercel
- Multi-tenant: every record scoped by org_id
- File storage: Supabase Storage bucket `tool-files`, path `{org_id}/{tool_id}/{filename}`
- Auth: NextAuth.js (Google OAuth) or API key (`Authorization: Bearer sk_fh_...`)
- No quality gate: security review is the only gate
- All file formats accepted
- Web UI is view-only: all actions via API
- Live tool serving: `/live/[id]` serves HTML tools full-screen

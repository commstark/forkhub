# The ForkHub — Migration Guide: Personal → Corporate

_Step-by-step for moving your personal dev setup to a corporate deployment._
_Written for non-technical users working in Claude Code._

---

## What Changes (and What Doesn't)

**The code doesn't change.** Your ForkHub app is the same codebase whether it runs on your personal accounts or corporate accounts. The only things that change are:

| What | Personal (now) | Corporate (after migration) |
|---|---|---|
| Vercel account | Your personal Vercel | Corporate Vercel team |
| Supabase project | Your personal project | Corporate Supabase project |
| Google OAuth | Your Google Cloud project | Corporate Google Cloud project (Workspace) |
| Domain | `yourapp.vercel.app` | `forkhub.yourcompany.com` (custom domain) |
| Slack webhook | Not configured | Corporate Slack workspace |
| Linear API | Not configured | Corporate Linear account |
| Users | Just you | Entire org via Google Workspace SSO |

---

## Step-by-Step Migration

### Step 1: Create Corporate Supabase Project (15 min)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project under a corporate org:
   - Name: `forkhub-prod` (or whatever your company prefers)
   - Pick a region close to your users
   - Save the password somewhere secure
3. Copy your **Project URL** and **anon key** from Project Settings → API
4. Copy your **service_role key** from the same page
5. Go to **SQL Editor** and run the full schema migration. Tell Claude Code:

> "Give me the complete SQL schema for The ForkHub — all tables, indexes, extensions, RLS policies, and the storage bucket. I need to run this on a fresh Supabase project."

6. Paste the SQL into the new Supabase SQL Editor and run it
7. Go to **Storage** → verify the `tool-files` bucket was created

### Step 2: Create Corporate Google OAuth Credentials (10 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use an existing corporate one)
3. APIs & Services → OAuth consent screen
   - Choose **Internal** (this restricts login to your Google Workspace domain only — no external users can sign in)
   - Fill in app name: "The ForkHub"
   - Add your corporate domain as authorized
4. APIs & Services → Credentials → Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://forkhub.yourcompany.com/api/auth/callback/google` (your production domain)
     - `http://localhost:3000/api/auth/callback/google` (for local dev)
5. Copy the **Client ID** and **Client Secret**

**Important:** Setting the consent screen to "Internal" means ONLY users with `@yourcompany.com` Google Workspace accounts can sign in. This is your first layer of access control.

### Step 3: Set Up Corporate Vercel (10 min)

1. Go to [vercel.com](https://vercel.com)
2. Create a team (or join your corporate team if one exists)
3. Import the ForkHub GitHub repository:
   - New Project → Import Git Repository → select `forkhub`
4. Before deploying, add **Environment Variables** in Vercel:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your new corporate Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your new corporate anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your new corporate service role key |
| `GOOGLE_CLIENT_ID` | Corporate Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Corporate Google OAuth Client Secret |
| `NEXTAUTH_URL` | `https://forkhub.yourcompany.com` (your production URL) |
| `NEXTAUTH_SECRET` | Generate a new one: run `openssl rand -base64 32` in terminal |

5. Deploy

### Step 4: Custom Domain (5 min)

1. In Vercel → your project → Settings → Domains
2. Add `forkhub.yourcompany.com` (or whatever subdomain you want)
3. Vercel will show you DNS records to add
4. Go to your company's DNS provider and add the records
5. Wait for DNS propagation (usually 5-30 minutes)
6. Vercel auto-provisions HTTPS

### Step 5: Configure Integrations (5 min per integration)

Go to `forkhub.yourcompany.com/admin` (you'll need to be admin — see Step 6).

**Slack:**
1. Go to [api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks)
2. Create an incoming webhook for your `#tool-reviews` channel (or similar)
3. Copy the webhook URL
4. Paste into the Slack webhook field in ForkHub admin
5. Click Test to verify

**Linear:**
1. Go to Linear → Settings → API → Personal API Keys
2. Generate a key
3. Copy the key and your project ID
4. Paste into the Linear fields in ForkHub admin

### Step 6: Set Up First Admin (2 min)

1. Sign in to ForkHub with your corporate Google account
2. Your user and org will be auto-created
3. Go to Supabase Table Editor → `users` table
4. Find your row → change `role` from `member` to `admin`
5. Sign out of ForkHub and sign back in (so the session picks up the new role)
6. You can now access `/admin` and manage other users

### Step 7: Configure Org-Specific Rules (5 min)

In the admin panel, set custom variables for your org:

| Key | Example Value |
|---|---|
| `deployment_platform` | "Corporate Vercel account only" |
| `banned_platforms` | "Railway, Render, Heroku, Fly.io" |
| `required_database` | "Corporate Supabase project" |
| `allowed_external_apis` | "OpenAI, Stripe (with approval)" |

These get read by AI agents via the SKILL.md when they upload tools.

### Step 8: Invite Users (ongoing)

With Google Workspace OAuth set to "Internal":
- Anyone with a `@yourcompany.com` email can sign in — they auto-join the org as `member`
- Promote reviewers and admins via API: `POST /api/admin/users/[id]/role`
- No manual invite process needed — Google Workspace IS the user directory

### Step 9: Clean Up Personal Setup (optional)

Once corporate is running:
- Your personal Supabase project can be deleted or kept as a sandbox
- Your personal Vercel deployment can be removed or kept for testing
- The GitHub repo stays the same — both environments deploy from it

---

## What About Your Test Data?

Your personal Supabase has test tools (Snake Game, etc.). The corporate Supabase project starts fresh — clean database, no test data. If you want demo data for launch:

Tell Claude Code:
> "Create a seed script that uploads 5-10 example tools to The ForkHub via the API, including a mix of internal_noncustomer (auto-approved) and external_customer (with security docs). Use realistic tool names and descriptions for a corporate demo."

---

## Troubleshooting

**"redirect_uri_mismatch" on Google sign-in:**
Your `NEXTAUTH_URL` in Vercel env vars doesn't match the redirect URI in Google Cloud Console. They must be exactly the same domain.

**"Requires reviewer or admin role" but I changed my role:**
Sign out and back in. NextAuth caches the role in the session token.

**Tools not showing on browse page:**
Only `approved` tools show. Check the tool's status in Supabase Table Editor.

**Live URLs not working for customers:**
Check the tool's `sharing` column — it must be `link` or `public`. Default is `private`.

---

## Cost Estimate for Corporate

| Service | Plan | Monthly Cost |
|---|---|---|
| Vercel | Pro ($20/seat + usage) | ~$20-50 |
| Supabase | Pro | $25 |
| Google Cloud (OAuth) | Free tier | $0 |
| Custom domain | You probably already have one | $0 |
| **Total** | | **~$45-75/month** |

This supports hundreds of users, thousands of tools, and unlimited live URLs.

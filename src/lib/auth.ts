import "server-only"
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabaseServer } from "@/lib/supabase-server"
import { sendEmail, welcomeEmail } from "@/lib/email"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false

      const domain = user.email.split("@")[1]

      // Personal email providers must never share an org — each user gets their own.
      // Only Google Workspace accounts (hd claim present and not gmail.com) auto-join
      // an existing org by domain.
      const PERSONAL_DOMAINS = new Set([
        "gmail.com", "hotmail.com", "yahoo.com", "outlook.com",
        "icloud.com", "me.com", "live.com", "aol.com", "protonmail.com",
      ])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hostedDomain = (profile as any)?.hd as string | undefined
      const isWorkspace  = !!hostedDomain && hostedDomain !== "gmail.com"
      const isPersonal   = PERSONAL_DOMAINS.has(domain) || !isWorkspace

      let org: { id: string } | null = null

      if (isWorkspace) {
        // Google Workspace: find or create a shared org for this domain
        const { data: existing } = await supabaseServer
          .from("orgs")
          .select("id")
          .eq("domain", domain)
          .single()

        if (existing) {
          org = existing
        } else {
          const slug = domain.replace(/\./g, "-")
          const { data: newOrg, error } = await supabaseServer
            .from("orgs")
            .insert({ name: domain, slug, domain })
            .select("id")
            .single()
          if (error) return false
          org = newOrg
        }
      } else {
        // Personal email: always create a fresh personal org so users never share one
        const baseName  = user.name ?? user.email.split("@")[0]
        const baseSlug  = `${user.email.split("@")[0]}-${Date.now()}`
        const { data: newOrg, error } = await supabaseServer
          .from("orgs")
          .insert({ name: baseName, slug: baseSlug, domain: isPersonal ? null : domain })
          .select("id")
          .single()
        if (error) return false
        org = newOrg
      }

      if (!org) return false

      // On first sign-in: create user as member — never auto-admin
      const { data: existingUser } = await supabaseServer
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single()

      if (!existingUser) {
        const { error } = await supabaseServer.from("users").insert({
          email: user.email,
          name: user.name,
          avatar_url: user.image,
          google_id: account?.providerAccountId,
          org_id: org.id,
          role: "member",
        })
        if (error) return false

        // Fire-and-forget welcome email
        if (user.email) {
          sendEmail(user.email, "Welcome to The ForkHub", welcomeEmail(user.name ?? user.email))
        }
      }

      return true
    },

    // Only query Supabase on initial sign-in (when `user` is present),
    // not on every subsequent request
    async jwt({ token, user }) {
      if (user?.email) {
        const { data } = await supabaseServer
          .from("users")
          .select("id, org_id, role")
          .eq("email", user.email)
          .single()

        if (data) {
          token.userId = data.id
          token.orgId = data.org_id
          token.role = data.role
        }
      }
      return token
    },

    async session({ session, token }) {
      // If the DB lookup failed at sign-in, token.userId will be missing.
      // Return an empty session rather than a partial one with undefined fields.
      if (!token.userId || !token.orgId) return session
      if (session.user) {
        session.user.id = token.userId as string
        session.user.orgId = token.orgId as string
        session.user.role = token.role as "admin" | "member" | "reviewer"
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}

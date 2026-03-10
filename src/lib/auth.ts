import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabaseServer } from "@/lib/supabase"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false

      const domain = user.email.split("@")[1]

      // Find or create org by email domain
      let { data: org } = await supabaseServer
        .from("orgs")
        .select("id")
        .eq("domain", domain)
        .single()

      if (!org) {
        const slug = domain.replace(/\./g, "-")
        const { data: newOrg, error } = await supabaseServer
          .from("orgs")
          .insert({ name: domain, slug, domain })
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

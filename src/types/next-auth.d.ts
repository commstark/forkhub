import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      orgId: string
      role: "admin" | "member" | "reviewer"
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string
    orgId: string
    role: "admin" | "member" | "reviewer"
  }
}

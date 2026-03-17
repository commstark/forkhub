import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    /*
     * Protect page routes only. API routes handle their own auth via
     * getServerSession so middleware redirects don't interfere with
     * JSON clients (curl, mobile apps, etc.)
     *
     * Excludes: /login, /api/*, /_next/*, /favicon.ico
     */
    "/((?!$|login|api|live|getting-started|_next/static|_next/image|favicon.ico).*)",
  ],
}

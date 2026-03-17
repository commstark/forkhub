import "server-only"
import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

export async function GET() {
  const filePath = join(process.cwd(), "SKILL.md")
  let content: string
  try {
    content = readFileSync(filePath, "utf-8")
  } catch {
    return NextResponse.json({ error: "SKILL.md not found" }, { status: 404 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? ""
  // Replace any placeholder deployment URL patterns in the skill file
  const patched = content.replace(/https?:\/\/yourorg\.forkhub\.com/g, baseUrl)

  return new NextResponse(patched, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"SKILL.md\"",
      "Cache-Control": "no-cache",
    },
  })
}

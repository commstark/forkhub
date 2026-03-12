import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

// Returns raw file content for non-HTML previews (images, code, markdown, CSV)
// Circumvents storage auth by using service role server-side

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return new NextResponse("Unauthorized", { status: 401 })

  const { data: tool } = await supabaseServer
    .from("tools")
    .select("id, org_id, file_name, file_type")
    .eq("id", params.id)
    .eq("org_id", auth.user.orgId)
    .single()

  if (!tool) return new NextResponse("Not found", { status: 404 })

  const storagePath = `${tool.org_id}/${tool.id}/${tool.file_name}`
  const { data: blob, error } = await supabaseServer.storage
    .from("tool-files")
    .download(storagePath)

  if (error || !blob) return new NextResponse("File not found", { status: 404 })

  const buffer = await blob.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": tool.file_type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${tool.file_name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  })
}

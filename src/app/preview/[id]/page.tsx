import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

// Server component — fetches HTML from storage server-side and renders via srcdoc
// Loaded inside a sandboxed iframe on the tool detail page

export default async function PreviewPage({
  params,
}: {
  params: { id: string }
}) {
  // Verify the caller belongs to the same org as the tool
  const session = await getServerSession(authOptions)
  const userOrgId = session?.user?.orgId

  const { data: tool } = await supabaseServer
    .from("tools")
    .select("id, org_id, file_name, file_type, file_url")
    .eq("id", params.id)
    .single()

  if (!tool || tool.org_id !== userOrgId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", color: "#999", fontSize: 14 }}>
        No preview available
      </div>
    )
  }

  // Extract storage path from file_url (handles safeStorageFilename sanitization)
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  let storagePath: string | null = null
  if (supabaseOrigin && tool.file_url?.startsWith(supabaseOrigin)) {
    const urlPath = new URL(tool.file_url).pathname
    const match = urlPath.match(/^\/storage\/v1\/object\/(?:public\/)?tool-files\/(.+)$/)
    if (match) storagePath = match[1]
  }
  if (!storagePath) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", color: "#999", fontSize: 14 }}>
        Could not load preview
      </div>
    )
  }

  const { data: blob, error } = await supabaseServer.storage
    .from("tool-files")
    .download(storagePath)

  if (error || !blob) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", color: "#999", fontSize: 14 }}>
        Could not load preview
      </div>
    )
  }

  const html = await blob.text()

  return (
    <iframe
      srcDoc={html}
      style={{ width: "100vw", height: "100vh", border: "none", display: "block" }}
      sandbox="allow-scripts allow-same-origin"
      title="Tool preview"
    />
  )
}

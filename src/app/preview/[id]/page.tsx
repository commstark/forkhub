import { createClient } from "@supabase/supabase-js"

// Server component — fetches HTML from storage server-side and renders via srcdoc
// Loaded inside a sandboxed iframe on the tool detail page

export default async function PreviewPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tool } = await supabase
    .from("tools")
    .select("id, org_id, file_name, file_type")
    .eq("id", params.id)
    .single()

  if (!tool) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", color: "#999", fontSize: 14 }}>
        No preview available
      </div>
    )
  }

  const storagePath = `${tool.org_id}/${tool.id}/${tool.file_name}`
  const { data: blob, error } = await supabase.storage
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

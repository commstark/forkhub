import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"
import { notifySlack, slackMessages } from "@/lib/slack"
import { buildInitialSecurityDoc } from "@/lib/security-doc"
import { randomUUID } from "crypto"
import { generatePreviewData } from "@/lib/preview-data"

const VALID_CLASSIFICATIONS = ["internal_noncustomer", "internal_customer", "external_customer"]

export async function POST(request: NextRequest) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: userId, orgId } = auth.user

  const formData = await request.formData()
  const title          = formData.get("title") as string
  const description    = formData.get("description") as string
  const category       = formData.get("category") as string
  const classification = formData.get("classification") as string
  const file           = formData.get("file") as File
  const parentToolId      = formData.get("parent_tool_id") as string | null
  const changeType        = (formData.get("change_type") as string | null) ?? "major_change"
  const securityDocRaw    = formData.get("security_doc") as string | null

  if (!title || !description || !category || !classification || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (!VALID_CLASSIFICATIONS.includes(classification)) {
    return NextResponse.json({ error: "Invalid classification" }, { status: 400 })
  }

  // If updating an approved tool with minor_change, auto-approve without review
  let isMinorUpdate = false
  if (parentToolId) {
    const { data: parent } = await supabaseServer
      .from("tools")
      .select("id, status, org_id")
      .eq("id", parentToolId)
      .eq("org_id", orgId)
      .single()

    if (parent?.status === "approved" && changeType === "minor_change") {
      isMinorUpdate = true
    }
  }

  const toolId      = randomUUID()
  const storagePath = `${orgId}/${toolId}/${file.name}`

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const { error: storageError } = await supabaseServer.storage
    .from("tool-files")
    .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false })

  if (storageError) {
    return NextResponse.json({ error: "File upload failed", details: storageError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseServer.storage
    .from("tool-files")
    .getPublicUrl(storagePath)

  // Generate preview data for supported file types
  const previewData = await generatePreviewData(fileBuffer, file.name, file.type)

  // Determine status
  let status: string
  if (isMinorUpdate) {
    status = "approved"
  } else if (classification === "internal_noncustomer") {
    status = "approved"
  } else {
    status = "in_review"
  }

  const now = new Date().toISOString()

  const { data: tool, error: toolError } = await supabaseServer
    .from("tools")
    .insert({
      id: toolId,
      org_id: orgId,
      creator_id: userId,
      title,
      description,
      category,
      classification,
      status,
      file_url: publicUrl,
      file_type: file.type,
      file_name: file.name,
      file_size: file.size,
      parent_tool_id: parentToolId || null,
      preview_data:   previewData ?? null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (toolError) {
    return NextResponse.json({ error: "Failed to create tool", details: toolError.message }, { status: 500 })
  }

  if (isMinorUpdate) {
    // Minor update to approved tool — auto-approve, no review
    await writeAuditLog({ orgId, userId, action: "tool.minor_update", targetType: "tool", targetId: toolId,
      metadata: { title, classification, parent_tool_id: parentToolId } })
  } else if (status === "in_review") {
    // Customer-facing new upload or major change — create review
    // Use agent-provided security_doc if supplied, otherwise build empty template
    let securityDoc: Record<string, unknown>
    if (securityDocRaw) {
      try {
        securityDoc = JSON.parse(securityDocRaw)
      } catch {
        securityDoc = buildInitialSecurityDoc({ file_type: file.type, file_name: file.name, classification, category })
      }
    } else {
      securityDoc = buildInitialSecurityDoc({ file_type: file.type, file_name: file.name, classification, category })
    }

    const { data: review, error: reviewError } = await supabaseServer
      .from("reviews")
      .insert({ tool_id: toolId, status: "pending", security_doc: securityDoc, created_at: now })
      .select("id")
      .single()
    if (reviewError) console.error("Failed to create review:", reviewError.message)

    await writeAuditLog({ orgId, userId, action: "tool.submitted", targetType: "tool", targetId: toolId,
      metadata: { title, classification, change_type: changeType } })

    notifySlack(orgId, slackMessages.submitted(
      title, auth.user.name ?? auth.user.email ?? "Unknown", classification, review?.id ?? "", securityDoc
    ))

    return NextResponse.json({
      ...tool,
      review_id: review?.id ?? null,
      security_doc_template: securityDocRaw ? null : securityDoc,
    }, { status: 201 })
  } else {
    await writeAuditLog({ orgId, userId, action: "tool.created", targetType: "tool", targetId: toolId,
      metadata: { title, classification, status } })
  }

  return NextResponse.json(tool, { status: 201 })
}

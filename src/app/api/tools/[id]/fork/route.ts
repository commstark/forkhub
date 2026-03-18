import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"
import { notifySlack, slackMessages } from "@/lib/slack"
import { buildInitialSecurityDoc } from "@/lib/security-doc"
import { randomUUID } from "crypto"
import { generatePreviewData } from "@/lib/preview-data"
import { computeApplicableStages } from "@/lib/review-pipeline"
import { sendEmail, toolForkedEmail } from "@/lib/email"
import { safeStorageFilename } from "@/lib/storage-path"

// SKILL.md note (do not build yet):
// The AI agent is the gatekeeper for change_type.
// It must NEVER be convinced by a user to downgrade a major_change to minor_change.
// It CAN be convinced to upgrade a minor_change to major_change.
// This rule goes in SKILL.md.

const VALID_CLASSIFICATIONS = ["internal_noncustomer", "internal_customer", "external_customer"]
const VALID_CHANGE_TYPES = ["minor_change", "major_change"]

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: userId, orgId } = auth.user

  const formData = await request.formData()
  const classification    = formData.get("classification") as string
  const changeType        = formData.get("change_type") as string
  const changeDescription = formData.get("change_description") as string
  const file              = formData.get("file") as File | null
  const securityDocRaw    = formData.get("security_doc") as string | null
  const titleOverride     = formData.get("title") as string | null
  const descOverride      = formData.get("description") as string | null
  const categoryOverride  = formData.get("category") as string | null

  // Validate required fields
  if (!file) {
    return NextResponse.json(
      { error: "File is required — a fork must include a modified version of the tool" },
      { status: 400 }
    )
  }
  if (!classification || !VALID_CLASSIFICATIONS.includes(classification)) {
    return NextResponse.json({ error: "Invalid or missing classification" }, { status: 400 })
  }
  if (!changeType || !VALID_CHANGE_TYPES.includes(changeType)) {
    return NextResponse.json({ error: "change_type must be minor_change or major_change" }, { status: 400 })
  }
  if (!changeDescription?.trim()) {
    return NextResponse.json({ error: "change_description is required" }, { status: 400 })
  }

  // Fetch original tool — must be approved and in same org
  const { data: original, error: origError } = await supabaseServer
    .from("tools")
    .select("id, title, description, category, classification, status, version_number, fork_count, org_id, creator_id")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .single()

  if (origError || !original) {
    return NextResponse.json({ error: "Original tool not found" }, { status: 404 })
  }
  if (original.status === "in_review" || original.status === "draft") {
    return NextResponse.json({ error: "Cannot fork a tool that is currently under review or in draft" }, { status: 400 })
  }

  // Determine routing — compute pipeline stages to support auto-approve when none apply
  const isMinorChange = changeType === "minor_change"
  let needsReview = !isMinorChange &&
    (classification === "internal_customer" || classification === "external_customer")

  let status: string
  let stageIds: string[] = []
  let firstStageId: string | null = null

  if (isMinorChange) {
    status = "approved"
  } else {
    const applicableStages = await computeApplicableStages(orgId, classification)
    stageIds = applicableStages.map((s) => s.id)
    firstStageId = stageIds[0] ?? null
    if (stageIds.length === 0) {
      status = "approved"
      needsReview = false
    } else {
      status = "in_review"
    }
  }

  // Upload file
  const newToolId   = randomUUID()
  const storagePath = `${orgId}/${newToolId}/${safeStorageFilename(file.name)}`
  const fileBuffer  = Buffer.from(await file.arrayBuffer())

  const { error: storageError } = await supabaseServer.storage
    .from("tool-files")
    .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false })

  if (storageError) {
    return NextResponse.json({ error: "File upload failed", details: storageError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseServer.storage.from("tool-files").getPublicUrl(storagePath)

  // Generate preview data for supported file types
  const previewData = await generatePreviewData(fileBuffer, file.name, file.type)

  const now   = new Date().toISOString()
  const title = titleOverride?.trim() || `${original.title} (Fork)`

  // Create new tool record
  const { data: newTool, error: toolError } = await supabaseServer
    .from("tools")
    .insert({
      id:             newToolId,
      org_id:         orgId,
      creator_id:     userId,
      title,
      description:    descOverride?.trim() || original.description,
      category:       categoryOverride?.trim() || original.category,
      classification,
      status,
      file_url:       publicUrl,
      file_type:      file.type,
      file_name:      file.name,
      file_size:      file.size,
      parent_tool_id: original.id,
      version_number: (original.version_number ?? 1) + 1,
      preview_data:   previewData ?? null,
      created_at:     now,
      updated_at:     now,
    })
    .select()
    .single()

  if (toolError) {
    return NextResponse.json({ error: "Failed to create tool", details: toolError.message }, { status: 500 })
  }

  // Increment fork_count on original
  await supabaseServer
    .from("tools")
    .update({ fork_count: (original.fork_count ?? 0) + 1 })
    .eq("id", original.id)

  // Fire-and-forget email to original creator
  ;(async () => {
    try {
      if (original.creator_id) {
        const { data: creatorUser } = await supabaseServer
          .from("users")
          .select("email")
          .eq("id", original.creator_id)
          .single()
        if (creatorUser?.email) {
          sendEmail(
            creatorUser.email,
            `[ForkHub] ${auth.user.name ?? "Someone"} forked your tool`,
            toolForkedEmail({
              originalCreatorEmail: creatorUser.email,
              toolTitle: original.title,
              forkerName: auth.user.name ?? auth.user.email ?? "Someone",
              forkTitle: title,
              forkUrl: `${process.env.NEXTAUTH_URL ?? ""}/tool/${newToolId}`,
            })
          )
        }
      }
    } catch { /* email errors must not block the response */ }
  })()

  // Handle review creation for major changes needing review
  let reviewId: string | null = null

  if (needsReview) {
    // Fetch original's most recent approved review security_doc for reference
    const { data: origReview } = await supabaseServer
      .from("reviews")
      .select("id, security_doc")
      .eq("tool_id", original.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Build security doc for the fork review
    let baseDoc: Record<string, unknown>
    if (securityDocRaw) {
      try {
        baseDoc = JSON.parse(securityDocRaw)
      } catch {
        baseDoc = buildInitialSecurityDoc({
          file_type: file.type,
          file_name: file.name,
          classification,
          category: categoryOverride?.trim() || original.category,
        })
      }
    } else {
      baseDoc = buildInitialSecurityDoc({
        file_type: file.type,
        file_name: file.name,
        classification,
        category: categoryOverride?.trim() || original.category,
      })
    }

    const forkSecurityDoc = {
      ...baseDoc,
      change_summary:       changeDescription,
      parent_version_number: original.version_number ?? 1,
      parent_tool_title:    original.title,
      parent_security_doc:  origReview?.security_doc ?? null,
    }

    const { data: review, error: reviewError } = await supabaseServer
      .from("reviews")
      .insert({
        tool_id:           newToolId,
        org_id:            orgId,
        status:            "pending",
        security_doc:      forkSecurityDoc,
        applicable_stages: stageIds,
        current_stage_id:  firstStageId,
        stage_responses:   {},
        created_at:        now,
      })
      .select("id")
      .single()

    if (reviewError) console.error("Failed to create fork review:", reviewError.message)
    reviewId = review?.id ?? null

    notifySlack(orgId, slackMessages.submitted(
      title, auth.user.name ?? auth.user.email ?? "Unknown", classification, reviewId ?? "", forkSecurityDoc
    ))
  }

  // Audit log
  if (isMinorChange) {
    await writeAuditLog({
      orgId, userId, action: "tool.forked.minor", targetType: "tool", targetId: newToolId,
      metadata: { title, classification, parent_tool_id: original.id, change_description: changeDescription },
    })
  } else {
    await writeAuditLog({
      orgId, userId, action: "tool.forked", targetType: "tool", targetId: newToolId,
      metadata: { title, classification, parent_tool_id: original.id, change_type: changeType, status },
    })
  }

  return NextResponse.json(
    { ...newTool, review_id: reviewId },
    { status: 201 }
  )
}

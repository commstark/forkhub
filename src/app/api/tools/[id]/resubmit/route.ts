import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"
import { writeAuditLog } from "@/lib/audit"
import { notifySlack, slackMessages } from "@/lib/slack"
import { buildInitialSecurityDoc } from "@/lib/security-doc"
import { generatePreviewData } from "@/lib/preview-data"
import { computeApplicableStages } from "@/lib/review-pipeline"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: userId, orgId } = auth.user

  const formData          = await request.formData()
  const file              = formData.get("file") as File | null
  const changeDescription = (formData.get("change_description") as string | null)?.trim()
  const descOverride      = (formData.get("description") as string | null)?.trim()
  const securityDocRaw    = formData.get("security_doc") as string | null

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 })
  }
  if (!changeDescription) {
    return NextResponse.json({ error: "change_description is required" }, { status: 400 })
  }

  // Fetch tool — must belong to this org
  const { data: tool, error: fetchError } = await supabaseServer
    .from("tools")
    .select("id, title, description, category, classification, status, file_url, org_id, creator_id")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .single()

  if (fetchError || !tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 })
  }

  if (tool.creator_id !== userId) {
    return NextResponse.json({ error: "Only the tool creator can resubmit" }, { status: 403 })
  }

  // Upload new file to versioned path — keeps old files in storage for audit
  const storagePath = `${orgId}/${params.id}/v${Date.now()}/${file.name}`
  const fileBuffer  = Buffer.from(await file.arrayBuffer())

  const { error: storageError } = await supabaseServer.storage
    .from("tool-files")
    .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false })

  if (storageError) {
    return NextResponse.json({ error: "File upload failed", details: storageError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseServer.storage.from("tool-files").getPublicUrl(storagePath)

  const previewData = await generatePreviewData(fileBuffer, file.name, file.type)

  // Determine new status
  const previousStatus  = tool.status
  const previousFileUrl = tool.file_url
  const needsReview     = tool.classification === "internal_customer" || tool.classification === "external_customer"
  const newStatus       = needsReview ? "in_review" : "approved"

  const updates: Record<string, unknown> = {
    file_url:     publicUrl,
    file_name:    file.name,
    file_type:    file.type,
    file_size:    file.size,
    preview_data: previewData ?? null,
    status:       newStatus,
    updated_at:   new Date().toISOString(),
  }
  if (descOverride) updates.description = descOverride

  const { data: updatedTool, error: updateError } = await supabaseServer
    .from("tools")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: "Failed to update tool", details: updateError.message }, { status: 500 })
  }

  // Create new review record if customer-classified — never overwrite old records
  let reviewId: string | null = null
  if (needsReview) {
    let securityDoc: Record<string, unknown>
    if (securityDocRaw) {
      try { securityDoc = JSON.parse(securityDocRaw) }
      catch { securityDoc = buildInitialSecurityDoc({ file_type: file.type, file_name: file.name, classification: tool.classification, category: tool.category }) }
    } else {
      securityDoc = buildInitialSecurityDoc({ file_type: file.type, file_name: file.name, classification: tool.classification, category: tool.category })
    }

    // change_description at top level so reviewers see what changed at a glance
    securityDoc = { change_description: changeDescription, ...securityDoc }

    const applicableStages = await computeApplicableStages(orgId, tool.classification)
    const stageIds         = applicableStages.map((s) => s.id)
    const firstStageId     = stageIds[0] ?? null

    const { data: review, error: reviewError } = await supabaseServer
      .from("reviews")
      .insert({
        tool_id:           params.id,
        status:            "pending",
        security_doc:      securityDoc,
        applicable_stages: stageIds,
        current_stage_id:  firstStageId,
        created_at:        new Date().toISOString(),
      })
      .select("id")
      .single()

    if (reviewError) console.error("Failed to create review:", reviewError.message)
    reviewId = review?.id ?? null

    notifySlack(orgId, {
      ...slackMessages.submitted(
        tool.title,
        auth.user.name ?? auth.user.email ?? "Unknown",
        tool.classification,
        reviewId ?? "",
        securityDoc
      ),
      status: "Resubmitted",
      notes: changeDescription,
    })
  }

  await writeAuditLog({
    orgId, userId, action: "tool.resubmitted", targetType: "tool", targetId: params.id,
    metadata: { change_description: changeDescription, previous_file_url: previousFileUrl, previous_status: previousStatus },
  })

  return NextResponse.json({ ...updatedTool, review_id: reviewId })
}

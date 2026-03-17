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
import { sendEmail, toolSubmittedEmail } from "@/lib/email"
import { safeStorageFilename } from "@/lib/storage-path"

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
  const securityDocRaw       = formData.get("security_doc") as string | null
  const stageResponsesRaw    = formData.get("stage_responses") as string | null

  if (!title?.trim() || !description?.trim() || !category?.trim() || !classification || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (title.trim().length > 200) {
    return NextResponse.json({ error: "Title must be 200 characters or fewer" }, { status: 400 })
  }
  if (!VALID_CLASSIFICATIONS.includes(classification)) {
    return NextResponse.json({ error: "Invalid classification" }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 })
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 400 })
  }

  // Disambiguate duplicate titles silently.
  // If "Title" exists → try "Title — FirstName" → "Title — FirstName 2" etc.
  // The final resolved title is returned in the response so uploaders know what was saved.
  let resolvedTitle = title.trim()
  {
    const { data: exactMatch } = await supabaseServer
      .from("tools")
      .select("id")
      .eq("org_id", orgId)
      .ilike("title", resolvedTitle)
      .limit(1)
      .single()

    if (exactMatch) {
      const firstName = (auth.user.name ?? auth.user.email ?? "").split(" ")[0] || "me"
      const withName = `${resolvedTitle} — ${firstName}`

      const { data: nameMatch } = await supabaseServer
        .from("tools")
        .select("id")
        .eq("org_id", orgId)
        .ilike("title", withName)
        .limit(1)
        .single()

      if (!nameMatch) {
        resolvedTitle = withName
      } else {
        // Find the next available suffix number
        let n = 2
        while (true) {
          const candidate = `${withName} ${n}`
          const { data: numMatch } = await supabaseServer
            .from("tools")
            .select("id")
            .eq("org_id", orgId)
            .ilike("title", candidate)
            .limit(1)
            .single()
          if (!numMatch) { resolvedTitle = candidate; break }
          n++
          if (n > 99) { resolvedTitle = `${withName} ${Date.now()}`; break } // safety valve
        }
      }
    }
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
  const storagePath = `${orgId}/${toolId}/${safeStorageFilename(file.name)}`

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

  // Determine status — compute pipeline stages first so we can auto-approve if none apply
  let status: string
  let stageIds: string[] = []
  let firstStageId: string | null = null

  if (isMinorUpdate || classification === "internal_noncustomer") {
    status = "approved"
  } else {
    const applicableStages = await computeApplicableStages(orgId, classification)
    stageIds = applicableStages.map((s) => s.id)
    firstStageId = stageIds[0] ?? null
    status = stageIds.length > 0 ? "in_review" : "approved"
  }

  const now = new Date().toISOString()

  const { data: tool, error: toolError } = await supabaseServer
    .from("tools")
    .insert({
      id: toolId,
      org_id: orgId,
      creator_id: userId,
      title:          resolvedTitle,
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
      metadata: { title: resolvedTitle, classification, parent_tool_id: parentToolId } })
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

    let stageResponses: Record<string, string> | null = null
    if (stageResponsesRaw) {
      try { stageResponses = JSON.parse(stageResponsesRaw) } catch { /* ignore invalid JSON */ }
    }

    const { data: review, error: reviewError } = await supabaseServer
      .from("reviews")
      .insert({
        tool_id:           toolId,
        status:            "pending",
        security_doc:      securityDoc,
        applicable_stages: stageIds,
        current_stage_id:  firstStageId,
        stage_responses:   stageResponses ?? {},
        created_at:        now,
      })
      .select("id")
      .single()
    if (reviewError) console.error("Failed to create review:", reviewError.message)

    await writeAuditLog({ orgId, userId, action: "tool.submitted", targetType: "tool", targetId: toolId,
      metadata: { title: resolvedTitle, classification, change_type: changeType } })

    notifySlack(orgId, slackMessages.submitted(
      resolvedTitle, auth.user.name ?? auth.user.email ?? "Unknown", classification, review?.id ?? "", securityDoc
    ))

    // Fire-and-forget email to first-stage reviewers
    if (firstStageId) {
      const reviewId = review?.id ?? ""
      ;(async () => {
        try {
          const stages = await computeApplicableStages(orgId, classification)
          const firstStage = stages[0]
          if (firstStage?.notify_email !== false && firstStage?.assigned_role) {
            const { data: reviewers } = await supabaseServer
              .from("users")
              .select("email")
              .eq("org_id", orgId)
              .eq("role", firstStage.assigned_role)
            if (reviewers) {
              const reviewUrl = `${process.env.NEXTAUTH_URL ?? ""}/review/${reviewId}`
              for (const reviewer of reviewers) {
                if (reviewer.email) {
                  sendEmail(
                    reviewer.email,
                    `[ForkHub Review] ${resolvedTitle} — ${firstStage.name}`,
                    toolSubmittedEmail({
                      reviewerEmail: reviewer.email,
                      toolTitle: resolvedTitle,
                      classification,
                      stageName: firstStage.name,
                      reviewUrl,
                    })
                  )
                }
              }
            }
          }
        } catch { /* email errors must not block the response */ }
      })()
    }

    return NextResponse.json({
      ...tool,
      review_id: review?.id ?? null,
      security_doc_template: securityDocRaw ? null : securityDoc,
    }, { status: 201 })
  } else {
    await writeAuditLog({ orgId, userId, action: "tool.created", targetType: "tool", targetId: toolId,
      metadata: { title: resolvedTitle, classification, status } })
  }

  return NextResponse.json(tool, { status: 201 })
}

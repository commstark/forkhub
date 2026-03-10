import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"
import { randomUUID } from "crypto"

const VALID_CLASSIFICATIONS = ["internal_noncustomer", "internal_customer", "external_customer"]

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: userId, orgId } = session.user

  const formData = await request.formData()
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const category = formData.get("category") as string
  const classification = formData.get("classification") as string
  const file = formData.get("file") as File

  if (!title || !description || !category || !classification || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (!VALID_CLASSIFICATIONS.includes(classification)) {
    return NextResponse.json({ error: "Invalid classification" }, { status: 400 })
  }

  const toolId = randomUUID()
  const storagePath = `${orgId}/${toolId}/${file.name}`

  // Upload file to Supabase Storage
  const { error: storageError } = await supabaseServer.storage
    .from("tool-files")
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    })

  if (storageError) {
    return NextResponse.json({ error: "File upload failed", details: storageError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseServer.storage
    .from("tool-files")
    .getPublicUrl(storagePath)

  const status = classification === "internal_noncustomer" ? "approved" : "in_review"
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
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (toolError) {
    return NextResponse.json({ error: "Failed to create tool", details: toolError.message }, { status: 500 })
  }

  // Create pending review for customer-facing classifications
  if (status === "in_review") {
    const { error: reviewError } = await supabaseServer
      .from("reviews")
      .insert({
        tool_id: toolId,
        status: "pending",
        security_doc: {},
        created_at: now,
      })
    if (reviewError) {
      console.error("Failed to create review row:", reviewError.message)
    }
  }

  return NextResponse.json(tool, { status: 201 })
}

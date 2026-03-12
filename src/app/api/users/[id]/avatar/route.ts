import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuth(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Only allow users to update their own avatar
  if (auth.user.id !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const ext  = file.name.split(".").pop() ?? "jpg"
  const path = `avatars/${params.id}/avatar.${ext}`

  // Upsert into tool-files bucket
  const { error: storageError } = await supabaseServer.storage
    .from("tool-files")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true })

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseServer.storage.from("tool-files").getPublicUrl(path)

  const { error: updateError } = await supabaseServer
    .from("users")
    .update({ avatar_url: publicUrl })
    .eq("id", params.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ avatar_url: publicUrl })
}

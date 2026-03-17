import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/getAuth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // No auth check — this is a public image endpoint.
  // The service role key is used server-side to access storage.
  const { data: user } = await supabaseServer
    .from("users")
    .select("avatar_url")
    .eq("id", params.id)
    .single()

  if (!user?.avatar_url) return new NextResponse(null, { status: 404 })

  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

  // If the avatar is stored in Supabase Storage, download it with the service
  // role key so it works regardless of whether the bucket is public or private.
  if (supabaseOrigin && user.avatar_url.startsWith(supabaseOrigin)) {
    const urlPath = new URL(user.avatar_url).pathname
    // pathname is one of:
    //   /storage/v1/object/public/<bucket>/<path>
    //   /storage/v1/object/<bucket>/<path>
    const match = urlPath.match(/^\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/)
    if (match) {
      const [, bucket, storagePath] = match
      const { data, error } = await supabaseServer.storage.from(bucket).download(storagePath)
      if (error || !data) return new NextResponse(null, { status: 404 })
      const buffer = await data.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": data.type || "image/jpeg",
          "Cache-Control": "public, max-age=3600",
        },
      })
    }
  }

  // Fallback for external URLs (e.g. Google OAuth profile pictures).
  const response = await fetch(user.avatar_url)
  if (!response.ok) return new NextResponse(null, { status: 404 })
  const buffer = await response.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  })
}

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

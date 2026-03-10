import "server-only"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseServer
    .from("tools")
    .select("id, title, description, category, classification, status, file_type, file_name, file_size, version_number, rating_avg, rating_count, created_at")
    .eq("creator_id", session.user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 })
  }

  return NextResponse.json(data)
}

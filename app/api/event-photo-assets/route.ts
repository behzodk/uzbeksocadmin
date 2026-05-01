import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { deleteEventPhotoObject, getEventPhotoPublicUrl } from "@/lib/cloudflare-r2"
import { requireGooglePhotosPermission } from "@/lib/google-photos-admin-auth"

export const runtime = "nodejs"

const createAssetSchema = z.object({
  eventId: z.string().uuid(),
  fileName: z.string().min(1),
  storagePath: z.string().min(1),
  publicUrl: z.string().url().optional(),
  mimeType: z.string().nullable(),
  fileSize: z.number().int().nonnegative().nullable(),
})

export async function POST(request: Request) {
  const auth = await requireGooglePhotosPermission("create")

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const payload = createAssetSchema.parse(await request.json())
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from("event_photo_assets")
      .insert({
        event_id: payload.eventId,
        file_name: payload.fileName,
        storage_path: payload.storagePath,
        public_url: getEventPhotoPublicUrl(payload.storagePath),
        mime_type: payload.mimeType,
        file_size: payload.fileSize,
      })
      .select("*")
      .single()

    if (error || !data) {
      await deleteEventPhotoObject(payload.storagePath)
      throw new Error(error?.message || "Unable to save the uploaded photo.")
    }

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the uploaded photo."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

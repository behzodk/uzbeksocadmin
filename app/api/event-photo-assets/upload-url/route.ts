import { NextResponse } from "next/server"
import { z } from "zod"
import { createEventPhotoObjectKey, createEventPhotoUploadUrl, getEventPhotoPublicUrl } from "@/lib/cloudflare-r2"
import { requireGooglePhotosPermission } from "@/lib/google-photos-admin-auth"

export const runtime = "nodejs"

const uploadRequestSchema = z.object({
  eventId: z.string().uuid(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
})

export async function POST(request: Request) {
  const auth = await requireGooglePhotosPermission("create")

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const payload = uploadRequestSchema.parse(await request.json())

    if (!payload.contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 })
    }

    const storagePath = createEventPhotoObjectKey(payload.eventId, payload.fileName)
    const uploadUrl = await createEventPhotoUploadUrl({
      objectKey: storagePath,
      contentType: payload.contentType,
    })

    return NextResponse.json({
      uploadUrl,
      storagePath,
      publicUrl: getEventPhotoPublicUrl(storagePath),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the upload URL."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

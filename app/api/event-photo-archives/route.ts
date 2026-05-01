import JSZip from "jszip"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { getEventPhotoObjectBytes } from "@/lib/cloudflare-r2"
import { requireGooglePhotosPermission } from "@/lib/google-photos-admin-auth"

export const runtime = "nodejs"
export const maxDuration = 300

const EVENT_PHOTO_ARCHIVES_BUCKET = process.env.NEXT_PUBLIC_EVENT_PHOTO_ARCHIVES_BUCKET || "event-photo-archives"

const archiveRequestSchema = z.object({
  eventId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()).min(1).max(1000),
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim() || "photo"
}

function buildArchiveStoragePath(eventId: string, eventTitle: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const slug = slugify(eventTitle) || "event"
  return `events/${eventId}/${slug}-${timestamp}.zip`
}

function buildArchiveFileName(eventTitle: string, assetCount: number) {
  const slug = slugify(eventTitle) || "event"
  const dateStamp = new Date().toISOString().slice(0, 10)
  return `${slug}-${dateStamp}-${assetCount}-photos.zip`
}

function getUniqueArchiveEntryName(fileName: string, usedNames: Set<string>) {
  const sanitized = sanitizeFileName(fileName)
  const extensionIndex = sanitized.lastIndexOf(".")
  const hasExtension = extensionIndex > 0
  const baseName = hasExtension ? sanitized.slice(0, extensionIndex) : sanitized
  const extension = hasExtension ? sanitized.slice(extensionIndex) : ""

  let candidate = sanitized
  let suffix = 2

  while (usedNames.has(candidate)) {
    candidate = `${baseName}-${suffix}${extension}`
    suffix += 1
  }

  usedNames.add(candidate)
  return candidate
}

function withArchiveSetupHint(message: string) {
  if (/bucket not found/i.test(message)) {
    return `Bucket not found. Run scripts/018-create-event-photo-archives.sql in Supabase or create the "${EVENT_PHOTO_ARCHIVES_BUCKET}" bucket.`
  }

  if (/relation .*event_photo_archives.* does not exist/i.test(message)) {
    return "The event_photo_archives table does not exist yet. Run scripts/018-create-event-photo-archives.sql in Supabase."
  }

  return message
}

export async function POST(request: Request) {
  const auth = await requireGooglePhotosPermission("create")

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const payload = archiveRequestSchema.parse(await request.json())
    const assetIds = Array.from(new Set(payload.assetIds))
    const supabase = getSupabaseAdminClient()

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title")
      .eq("id", payload.eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 })
    }

    const { data: assets, error: assetsError } = await supabase
      .from("event_photo_assets")
      .select("id, file_name, storage_path")
      .eq("event_id", payload.eventId)
      .in("id", assetIds)
      .order("created_at", { ascending: true })

    if (assetsError) {
      throw new Error(assetsError.message || "Unable to load the selected photos.")
    }

    if (!assets || assets.length !== assetIds.length) {
      return NextResponse.json({ error: "Some selected photos could not be found for this event." }, { status: 400 })
    }

    const zip = new JSZip()
    const usedNames = new Set<string>()

    for (const asset of assets) {
      const bytes = await getEventPhotoObjectBytes(asset.storage_path)
      const archiveEntryName = getUniqueArchiveEntryName(asset.file_name, usedNames)
      zip.file(archiveEntryName, bytes)
    }

    const archiveBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    })

    const storagePath = buildArchiveStoragePath(event.id, event.title)
    const fileName = buildArchiveFileName(event.title, assets.length)

    const { error: uploadError } = await supabase.storage.from(EVENT_PHOTO_ARCHIVES_BUCKET).upload(storagePath, archiveBuffer, {
      contentType: "application/zip",
      upsert: false,
    })

    if (uploadError) {
      throw new Error(withArchiveSetupHint(uploadError.message || "Unable to upload the ZIP archive to Supabase Storage."))
    }

    const { data: publicUrlData } = supabase.storage.from(EVENT_PHOTO_ARCHIVES_BUCKET).getPublicUrl(storagePath)

    const { data: archiveRecord, error: archiveError } = await supabase
      .from("event_photo_archives")
      .insert({
        event_id: event.id,
        file_name: fileName,
        storage_path: storagePath,
        public_url: publicUrlData.publicUrl,
        asset_count: assets.length,
        file_size: archiveBuffer.byteLength,
        photo_asset_ids: assets.map((asset) => asset.id),
        created_by: auth.user.id,
      })
      .select("*")
      .single()

    if (archiveError || !archiveRecord) {
      await supabase.storage.from(EVENT_PHOTO_ARCHIVES_BUCKET).remove([storagePath])
      throw new Error(withArchiveSetupHint(archiveError?.message || "Unable to save the ZIP archive metadata."))
    }

    return NextResponse.json(archiveRecord)
  } catch (error) {
    const message = error instanceof Error ? withArchiveSetupHint(error.message) : "Unable to create the ZIP archive."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

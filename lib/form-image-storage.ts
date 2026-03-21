import type { SupabaseClient } from "@supabase/supabase-js"

const FORM_IMAGES_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_FORM_IMAGES_BUCKET || "form-images"

export interface StoredFormImageAnswer {
  url: string
  path: string | null
  fileName: string | null
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase()
  return extension || "jpg"
}

function createUploadPath(folder: string, fileName: string) {
  const extension = getFileExtension(fileName)
  const objectId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return `${folder}/${objectId}.${extension}`
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function getFormImagesBucket() {
  return FORM_IMAGES_BUCKET
}

export function parseFormImageAnswer(value: unknown): StoredFormImageAnswer | null {
  const directUrl = readString(value)
  if (directUrl) {
    return {
      url: directUrl,
      path: null,
      fileName: null,
    }
  }

  if (!value || typeof value !== "object") {
    return null
  }

  const candidate = value as Record<string, unknown>
  const url = readString(candidate.url) || readString(candidate.publicUrl) || readString(candidate.imageUrl)
  if (!url) {
    return null
  }

  return {
    url,
    path: readString(candidate.path) || readString(candidate.storagePath),
    fileName: readString(candidate.fileName) || readString(candidate.name),
  }
}

export async function uploadFormImage({
  supabase,
  file,
  folder,
  existingPath,
}: {
  supabase: SupabaseClient
  file: File
  folder: string
  existingPath?: string | null
}) {
  const uploadPath = createUploadPath(folder, file.name)

  const { error: uploadError } = await supabase.storage.from(FORM_IMAGES_BUCKET).upload(uploadPath, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  })

  if (uploadError) {
    throw uploadError
  }

  if (existingPath) {
    await supabase.storage.from(FORM_IMAGES_BUCKET).remove([existingPath])
  }

  const { data } = supabase.storage.from(FORM_IMAGES_BUCKET).getPublicUrl(uploadPath)

  return {
    path: uploadPath,
    publicUrl: data.publicUrl,
  }
}

export async function removeFormImage({
  supabase,
  storagePath,
}: {
  supabase: SupabaseClient
  storagePath?: string | null
}) {
  if (!storagePath) return
  await supabase.storage.from(FORM_IMAGES_BUCKET).remove([storagePath])
}

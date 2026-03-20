import type { SupabaseClient } from "@supabase/supabase-js"

const COMPETITION_IMAGES_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_COMPETITION_IMAGES_BUCKET || "competition-images"

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

export function getCompetitionImagesBucket() {
  return COMPETITION_IMAGES_BUCKET
}

export async function uploadCompetitionImage({
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

  const { error: uploadError } = await supabase.storage.from(COMPETITION_IMAGES_BUCKET).upload(uploadPath, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  })

  if (uploadError) {
    throw uploadError
  }

  if (existingPath) {
    await supabase.storage.from(COMPETITION_IMAGES_BUCKET).remove([existingPath])
  }

  const { data } = supabase.storage.from(COMPETITION_IMAGES_BUCKET).getPublicUrl(uploadPath)

  return {
    path: uploadPath,
    publicUrl: data.publicUrl,
  }
}

export async function removeCompetitionImage({
  supabase,
  storagePath,
}: {
  supabase: SupabaseClient
  storagePath?: string | null
}) {
  if (!storagePath) return
  await supabase.storage.from(COMPETITION_IMAGES_BUCKET).remove([storagePath])
}

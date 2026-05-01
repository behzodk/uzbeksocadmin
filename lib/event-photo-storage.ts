interface EventPhotoUploadPreparation {
  uploadUrl: string
  storagePath: string
  publicUrl: string
}

interface EventPhotoAssetPayload {
  eventId: string
  fileName: string
  storagePath: string
  publicUrl: string
  mimeType: string | null
  fileSize: number | null
}

function createRequestError(message: string, status?: number) {
  const error = new Error(message)

  if (typeof status === "number") {
    ;(error as Error & { status?: number }).status = status
  }

  return error
}

async function parseJsonResponse(response: Response) {
  try {
    return (await response.json()) as { error?: string; message?: string }
  } catch {
    return {}
  }
}

async function requestUploadPreparation({
  eventId,
  fileName,
  contentType,
}: {
  eventId: string
  fileName: string
  contentType: string
}) {
  const response = await fetch("/api/event-photo-assets/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventId,
      fileName,
      contentType,
    }),
  })

  if (!response.ok) {
    const payload = await parseJsonResponse(response)
    throw createRequestError(payload.error || payload.message || "Unable to prepare the upload.", response.status)
  }

  return (await response.json()) as EventPhotoUploadPreparation
}

function uploadFileToSignedUrl({
  uploadUrl,
  file,
  contentType,
  onProgress,
}: {
  uploadUrl: string
  file: File
  contentType: string
  onProgress?: (loaded: number, total: number) => void
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", uploadUrl)
    xhr.setRequestHeader("Content-Type", contentType)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded, event.total)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }

      reject(createRequestError(xhr.statusText || "Upload failed.", xhr.status))
    }

    xhr.onerror = () => {
      reject(new Error("Network error while uploading the file."))
    }

    xhr.send(file)
  })
}

export async function uploadEventPhotoWithProgress({
  file,
  eventId,
  onProgress,
}: {
  file: File
  eventId: string
  onProgress?: (loaded: number, total: number) => void
}) {
  const preparation = await requestUploadPreparation({
    eventId,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
  })

  await uploadFileToSignedUrl({
    uploadUrl: preparation.uploadUrl,
    file,
    contentType: file.type || "application/octet-stream",
    onProgress,
  })

  return {
    path: preparation.storagePath,
    publicUrl: preparation.publicUrl,
  }
}

export async function createEventPhotoAsset(payload: EventPhotoAssetPayload) {
  const response = await fetch("/api/event-photo-assets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const result = await parseJsonResponse(response)
    throw createRequestError(result.error || result.message || "Unable to save the uploaded photo.", response.status)
  }

  return response.json()
}

export async function removeEventPhoto(assetId: string) {
  const response = await fetch(`/api/event-photo-assets/${assetId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const result = await parseJsonResponse(response)
    throw createRequestError(result.error || result.message || "Unable to delete this photo.", response.status)
  }
}

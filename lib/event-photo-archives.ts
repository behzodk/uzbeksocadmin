interface CreateEventPhotoArchivePayload {
  eventId: string
  assetIds: string[]
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

export async function createEventPhotoArchive(payload: CreateEventPhotoArchivePayload) {
  const response = await fetch("/api/event-photo-archives", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const result = await parseJsonResponse(response)
    throw createRequestError(result.error || result.message || "Unable to create the ZIP archive.", response.status)
  }

  return response.json()
}

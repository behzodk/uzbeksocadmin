import type { FormPartner } from "@/lib/types"

export const MAX_FORM_PARTNERS = 2

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "")

function parsePartnerValue(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return []
    }

    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

export function createFormPartnerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `partner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyFormPartner(): FormPartner {
  return {
    id: createFormPartnerId(),
    name: "",
    logo_url: "",
    logo_path: null,
    url: "",
  }
}

export function normalizeFormPartners(value: unknown): FormPartner[] {
  const partnerList = parsePartnerValue(value)

  const normalizedPartners: FormPartner[] = []

  partnerList.forEach((partner) => {
    if (!partner || typeof partner !== "object") {
      return
    }

    const record = partner as Record<string, unknown>

    normalizedPartners.push({
      id: readString(record.id) || createFormPartnerId(),
      name: readString(record.name),
      logo_url: readString(record.logo_url || record.logoUrl),
      logo_path: readString(record.logo_path || record.logoPath) || null,
      url: readString(record.url),
    })
  })

  return normalizedPartners.slice(0, MAX_FORM_PARTNERS)
}

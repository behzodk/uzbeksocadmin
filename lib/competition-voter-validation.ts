import type { CompetitionVoterValidationSettings } from "@/lib/types"

export function normalizeCompetitionVoterValidationSettings(
  settings?: CompetitionVoterValidationSettings | null,
): CompetitionVoterValidationSettings {
  return {
    rating_identity_field: settings?.rating_identity_field === "guest_email" ? "guest_email" : "guest_email",
    eligibility_form_id:
      typeof settings?.eligibility_form_id === "string" && settings.eligibility_form_id.trim()
        ? settings.eligibility_form_id
        : null,
    eligibility_form_field_key:
      typeof settings?.eligibility_form_field_key === "string" && settings.eligibility_form_field_key.trim()
        ? settings.eligibility_form_field_key.trim()
        : null,
  }
}

export function normalizeVoterIdentity(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() || ""
  return normalized || null
}

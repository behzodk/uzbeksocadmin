import type { Form, FormField } from "@/lib/types"

export function getSortedFormFields(form: Pick<Form, "schema"> | { schema?: { fields?: FormField[] | null } | null }) {
  return [...(form.schema?.fields || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function isDisplayOnlyFormField(field: FormField) {
  return field.type === "content"
}

export function isAnswerableFormField(field: FormField) {
  return !isDisplayOnlyFormField(field)
}

export function countAnswerableFormFields(fields?: FormField[] | null) {
  return (fields || []).filter(isAnswerableFormField).length
}

interface ConditionalFormField {
  key: string
  conditional?: { field_key: string; option: string }
}

/** Fields must be in display order; a condition can only depend on a visible field above it. */
export function getVisibleFormFields<T extends ConditionalFormField>(fields: T[], answers: Record<string, unknown>): T[] {
  const visibleKeys = new Set<string>()
  return fields.filter((field) => {
    if (field.conditional) {
      const { field_key, option } = field.conditional
      if (!visibleKeys.has(field_key)) return false
      const value = answers[field_key]
      if (typeof value !== "string" || value.trim() !== option) return false
    }
    visibleKeys.add(field.key)
    return true
  })
}

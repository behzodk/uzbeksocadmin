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

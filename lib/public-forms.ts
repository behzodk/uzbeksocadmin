import type { Form } from "@/lib/types"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"

const PUBLIC_FORM_SELECT = "id, slug, title, is_active, max_response, schema, partners, event_id, created_at"

export interface PublicFormRecord extends Form {
  response_count: number
}

async function fetchPublicForm(identifier: string) {
  const supabase = getSupabaseAdminClient()

  const { data: formById, error: formByIdError } = await supabase
    .from("forms")
    .select(PUBLIC_FORM_SELECT)
    .eq("id", identifier)
    .maybeSingle()

  if (formByIdError) {
    throw new Error(formByIdError.message || "Unable to load form.")
  }

  if (formById) {
    return formById as Form
  }

  const { data: formBySlug, error: formBySlugError } = await supabase
    .from("forms")
    .select(PUBLIC_FORM_SELECT)
    .eq("slug", identifier)
    .maybeSingle()

  if (formBySlugError) {
    throw new Error(formBySlugError.message || "Unable to load form.")
  }

  return (formBySlug as Form | null) ?? null
}

export async function getPublicFormById(id: string): Promise<PublicFormRecord | null> {
  const form = await fetchPublicForm(id)

  if (!form) {
    return null
  }

  const supabase = getSupabaseAdminClient()

  const { count, error: countError } = await supabase
    .from("form_submissions")
    .select("id", { count: "exact", head: true })
    .eq("form_id", form.id)

  if (countError) {
    throw new Error(countError.message || "Unable to load form response count.")
  }

  return {
    ...form,
    response_count: count ?? 0,
  }
}

export function isPublicFormFull(form: Pick<PublicFormRecord, "max_response" | "response_count">) {
  return form.max_response !== null && form.response_count >= form.max_response
}

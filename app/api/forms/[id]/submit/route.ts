import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { getSortedFormFields, isAnswerableFormField } from "@/lib/form-schema"
import { getPublicFormById, isPublicFormFull } from "@/lib/public-forms"
import type { FormField } from "@/lib/types"

export const runtime = "nodejs"

const submitFormSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
})

function isFieldVisible(field: FormField, answers: Record<string, unknown>) {
  if (!field.conditional) {
    return true
  }

  const targetValue = answers[field.conditional.field_key]
  if (typeof targetValue === "string") {
    return targetValue.trim() === field.conditional.option
  }

  return String(targetValue ?? "") === field.conditional.option
}

function normalizeAnswerValue(field: FormField, value: unknown) {
  if (field.type === "multi_select") {
    return Array.isArray(value) ? value.map((item) => String(item)) : []
  }

  if (field.type === "boolean") {
    return value === true
  }

  if (field.type === "rating") {
    return typeof value === "number" && Number.isFinite(value) ? value : null
  }

  if (field.type === "image") {
    if (!value) {
      return null
    }

    if (typeof value === "string") {
      return value.trim() || null
    }

    return value
  }

  if (field.type === "select") {
    return typeof value === "string" ? value.trim() : ""
  }

  if (field.type === "email") {
    return typeof value === "string" ? value.trim().toLowerCase() : ""
  }

  return typeof value === "string" ? value.trim() : value ?? ""
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    const payload = submitFormSchema.parse(await request.json())
    const form = await getPublicFormById(id)

    if (!form) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 })
    }

    if (!form.is_active) {
      return NextResponse.json({ error: "This form is not accepting responses right now." }, { status: 409 })
    }

    if (isPublicFormFull(form)) {
      return NextResponse.json({ error: "This form has reached its response limit." }, { status: 409 })
    }

    const visibleAnswerableFields = getSortedFormFields(form)
      .filter(isAnswerableFormField)
      .filter((field) => isFieldVisible(field, payload.answers))

    const answers = Object.fromEntries(
      visibleAnswerableFields.map((field) => [field.key, normalizeAnswerValue(field, payload.answers[field.key])]),
    )

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from("form_submissions").insert({
      form_id: form.id,
      status: "submitted",
      answers,
    })

    if (error) {
      throw new Error(error.message || "Unable to save your response.")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save your response."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

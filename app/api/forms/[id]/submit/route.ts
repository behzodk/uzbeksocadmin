import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { getSortedFormFields, getVisibleFormFields, isAnswerableFormField } from "@/lib/form-schema"
import { getPublicFormById, isPublicFormFull } from "@/lib/public-forms"
import { validateFormField } from "@/lib/form-validation"
import type { FormField } from "@/lib/types"

export const runtime = "nodejs"

const submitFormSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
})

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

    const visibleAnswerableFields = getVisibleFormFields(getSortedFormFields(form), payload.answers)
      .filter(isAnswerableFormField)

    // Validate original values before normalization can hide malformed input.
    const errors: Record<string, string> = {}
    for (const field of visibleAnswerableFields) {
      const error = validateFormField(field, payload.answers[field.key])
      if (error) errors[field.key] = error
    }
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Please fix the highlighted fields and try again.", errors }, { status: 400 })
    }

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

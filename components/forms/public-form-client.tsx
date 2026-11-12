"use client"

import { isIllustratedFormTheme } from "@/components/forms/themed-form-parts"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Loader2, Star, Upload } from "lucide-react"
import { ThemedStatusCard } from "@/components/forms/themed-form-parts"
import { ContentPreview } from "@/components/editor/content-preview"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSortedFormFields, getVisibleFormFields, isAnswerableFormField } from "@/lib/form-schema"
import { validateTextInput } from "@/lib/text-input-validation"
import { validateFormField } from "@/lib/form-validation"
import { uploadFormImage } from "@/lib/form-image-storage"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Form, FormField } from "@/lib/types"

type FormAnswers = Record<string, unknown>

type ImageSelection = {
  file: File
  fileName: string
  previewUrl: string
}

function getFieldOptions(field: FormField) {
  return (field.options || []).map((option) => option.trim()).filter(Boolean)
}

function createInitialAnswers(form: Form): FormAnswers {
  const initialAnswers: FormAnswers = {}

  getSortedFormFields(form).forEach((field) => {
    if (field.type === "multi_select") {
      initialAnswers[field.key] = field.is_ranked ? getFieldOptions(field) : []
      return
    }

    if (field.type === "boolean") {
      initialAnswers[field.key] = false
    }
  })

  return initialAnswers
}

export function PublicFormClient({ form, preview = false }: { form: Form; preview?: boolean }) {
  const fields = useMemo(() => getSortedFormFields(form), [form])
  const initialAnswers = useMemo(() => createInitialAnswers(form), [form])
  const [answers, setAnswers] = useState<FormAnswers>(initialAnswers)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imageSelections, setImageSelections] = useState<Record<string, ImageSelection>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingKeys, setUploadingKeys] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)

  useEffect(() => {
    setAnswers(initialAnswers)
    setErrors({})
    setImageSelections((previous) => {
      Object.values(previous).forEach((selection) => URL.revokeObjectURL(selection.previewUrl))
      return {}
    })
    setSubmitError(null)
    setSubmittedAt(null)
  }, [initialAnswers])

  const imageSelectionsRef = useRef(imageSelections)
  useEffect(() => { imageSelectionsRef.current = imageSelections }, [imageSelections])
  useEffect(() => () => {
    Object.values(imageSelectionsRef.current).forEach((selection) => URL.revokeObjectURL(selection.previewUrl))
  }, [])

  const visibleFields = useMemo(() => getVisibleFormFields(fields, answers), [answers, fields])

  const updateAnswer = (key: string, value: unknown) => {
    setAnswers((previous) => ({ ...previous, [key]: value }))
    const field = fields.find((candidate) => candidate.key === key)
    const error = field ? validateTextInput(field, value) : null
    setErrors((previous) => {
      const next = { ...previous }
      if (error) next[key] = error
      else delete next[key]
      return next
    })
  }

  const setImageSelection = (fieldKey: string, file: File | null) => {
    setImageSelections((previous) => {
      const currentSelection = previous[fieldKey]
      if (currentSelection) {
        URL.revokeObjectURL(currentSelection.previewUrl)
      }

      if (!file) {
        const nextSelections = { ...previous }
        delete nextSelections[fieldKey]
        return nextSelections
      }

      return {
        ...previous,
        [fieldKey]: {
          file,
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
        },
      }
    })

    setErrors((previous) => {
      if (!(fieldKey in previous)) {
        return previous
      }

      const nextErrors = { ...previous }
      delete nextErrors[fieldKey]
      return nextErrors
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    const answerableVisibleFields = visibleFields.filter(isAnswerableFormField)
    const nextErrors: Record<string, string> = {}

    answerableVisibleFields.forEach((field) => {
      const validationError = validateFormField(field, answers[field.key], {
        studentEmailMode: "username",
        hasSelectedImage: Boolean(imageSelections[field.key]?.file),
      })
      if (validationError) {
        nextErrors[field.key] = validationError
      }
    })

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    if (preview) {
      setSubmittedAt(new Date().toISOString())
      return
    }
    setIsSubmitting(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const payload: Record<string, unknown> = {}

      for (const field of answerableVisibleFields) {
        const currentValue = answers[field.key]

        if (field.type === "image") {
          const imageSelection = imageSelections[field.key]

          if (imageSelection?.file) {
            setUploadingKeys((previous) => [...previous, field.key])

            try {
              const upload = await uploadFormImage({
                supabase,
                file: imageSelection.file,
                folder: `forms/${form.id}/${field.key}`,
              })

              payload[field.key] = {
                url: upload.publicUrl,
                path: upload.path,
                fileName: imageSelection.fileName,
              }
            } finally {
              setUploadingKeys((previous) => previous.filter((key) => key !== field.key))
            }
          } else {
            payload[field.key] = null
          }

          continue
        }

        if (field.type === "multi_select") {
          payload[field.key] = Array.isArray(currentValue) ? currentValue : []
          continue
        }

        if (field.type === "boolean") {
          payload[field.key] = currentValue === true
          continue
        }

        if (field.type === "rating") {
          payload[field.key] = typeof currentValue === "number" ? currentValue : null
          continue
        }

        if (field.type === "email" && field.is_student_email) {
          const username = typeof currentValue === "string" ? currentValue.trim().replace(/@/g, "") : ""
          payload[field.key] = username ? `${username}@student.bham.ac.uk` : ""
          continue
        }

        payload[field.key] = typeof currentValue === "string" ? currentValue.trim() : currentValue ?? ""
      }

      const response = await fetch(`/api/forms/${form.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers: payload }),
      })

      const result = (await response.json().catch(() => null)) as { error?: string; errors?: Record<string, string> } | null

      if (!response.ok) {
        if (result?.errors) setErrors(result.errors)
        throw new Error(result?.error || "Unable to submit the form.")
      }

      setSubmittedAt(new Date().toISOString())
      setAnswers(initialAnswers)
      setErrors({})
      setImageSelections((previous) => {
        Object.values(previous).forEach((selection) => URL.revokeObjectURL(selection.previewUrl))
        return {}
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to submit the form.")
    } finally {
      setUploadingKeys([])
      setIsSubmitting(false)
    }
  }

  if (submittedAt && isIllustratedFormTheme(form.schema.theme)) return <ThemedStatusCard theme={form.schema.theme} status="success" title={preview ? "Preview complete" : "Response received"} description={preview ? "Your preview is complete. No response or image has been saved." : undefined}><Button type="button" className="game-primary-action" onClick={() => setSubmittedAt(null)}>{preview ? "Back to preview" : "Submit another response"}</Button></ThemedStatusCard>

  if (submittedAt) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Response submitted</h2>
            <p className="text-sm text-muted-foreground">
              Your response has been recorded. Submitted on{" "}
              {new Date(submittedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              .
            </p>
            <Button type="button" variant="outline" onClick={() => setSubmittedAt(null)}>
              Submit another response
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <p>{submitError}</p>
          </div>
        </div>
      ) : null}

      {visibleFields.map((field) => {
        const error = errors[field.key]
        const options = getFieldOptions(field)
        const selectValue = typeof answers[field.key] === "string" ? (answers[field.key] as string) : undefined
        const multiValue = Array.isArray(answers[field.key]) ? (answers[field.key] as string[]) : []
        const ratingValue = typeof answers[field.key] === "number" ? (answers[field.key] as number) : null
        const imageSelection = imageSelections[field.key]

        if (field.type === "content") {
          return (
            <div key={field.id} className="game-content-block rounded-2xl border border-border/70 bg-muted/20 p-5">
              {field.label ? <p className="mb-3 text-base font-semibold text-foreground">{field.label}</p> : null}
              {field.content_html ? (
                <ContentPreview content={field.content_html} />
              ) : (
                <p className="text-sm text-muted-foreground">Additional information will appear here.</p>
              )}
            </div>
          )
        }

        return (
          <div key={field.id} data-invalid={Boolean(error)} className="game-question space-y-3">
            {field.type !== "boolean" ? (
              <div className="space-y-1">
                <Label htmlFor={field.key} className="text-sm font-medium text-foreground">
                  {field.label}
                  {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                </Label>
                {field.type === "multi_select" && field.is_ranked ? (
                  <p className="text-xs text-muted-foreground">Use the arrows to rank options from highest to lowest.</p>
                ) : null}
              </div>
            ) : null}

            {field.type === "text" ? (
              <Input
                id={field.key}
                value={typeof answers[field.key] === "string" ? (answers[field.key] as string) : ""}
                onChange={(event) => updateAnswer(field.key, event.target.value)}
                maxLength={field.max_count ?? undefined}
                aria-invalid={Boolean(error)} aria-describedby={error ? `${field.key}-error` : undefined}
                placeholder={field.label}
              />
            ) : null}

            {field.type === "textarea" && <Textarea id={field.key} value={typeof answers[field.key] === "string" ? answers[field.key] as string : ""} onChange={(event) => updateAnswer(field.key, event.target.value)} rows={4} maxLength={field.max_count ?? undefined} aria-invalid={Boolean(error)} aria-describedby={error ? `${field.key}-error` : undefined} placeholder={field.label} />}

            {field.type === "email" && !field.is_student_email ? (
              <Input
                id={field.key}
                type="email"
                value={typeof answers[field.key] === "string" ? (answers[field.key] as string) : ""}
                onChange={(event) => updateAnswer(field.key, event.target.value.toLowerCase())}
                maxLength={field.max_count ?? undefined}
                aria-invalid={Boolean(error)} aria-describedby={error ? `${field.key}-error` : undefined}
                placeholder="name@example.com"
              />
            ) : null}

            {field.type === "email" && field.is_student_email ? (
              <div className="game-student-email flex overflow-hidden rounded-md border border-input shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <input
                  id={field.key}
                  value={typeof answers[field.key] === "string" ? (answers[field.key] as string) : ""}
                  onChange={(event) => updateAnswer(field.key, event.target.value.replace(/@/g, ""))}
                  maxLength={field.max_count ?? undefined}
                  aria-invalid={Boolean(error)} aria-describedby={error ? `${field.key}-error` : undefined}
                  placeholder="username"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                />
                <div className="shrink-0 border-l border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  @student.bham.ac.uk
                </div>
              </div>
            ) : null}

            {field.type === "select" ? (
              field.use_radio_buttons ? (
                <RadioGroup value={selectValue} onValueChange={(value) => updateAnswer(field.key, value)} aria-label={field.label} className="game-choice-grid gap-3">
                  {options.map((option) => (
                    <label
                      key={option}
                      htmlFor={`${field.key}-${option}`}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40"
                    >
                      <RadioGroupItem id={`${field.key}-${option}`} value={option} aria-invalid={Boolean(error)} aria-describedby={error ? `${field.key}-error` : undefined} />
                      <span className="text-sm text-foreground">{option}</span>
                    </label>
                  ))}
                </RadioGroup>
              ) : (
                <Select value={selectValue} onValueChange={(value) => updateAnswer(field.key, value)}>
                  <SelectTrigger id={field.key} className="w-full" aria-invalid={Boolean(error)} aria-describedby={error ? `${field.key}-error` : undefined}>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            ) : null}

            {field.type === "multi_select" && !field.is_ranked ? (
              <div className={field.use_radio_buttons ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}>
                {options.map((option) => {
                  const checked = multiValue.includes(option)
                  return (
                    <label
                      key={option}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) => {
                          const nextValues = nextChecked === true
                            ? [...multiValue, option]
                            : multiValue.filter((item) => item !== option)
                          updateAnswer(field.key, nextValues)
                        }}
                      />
                      <span className="text-sm text-foreground">{option}</span>
                    </label>
                  )
                })}
              </div>
            ) : null}

            {field.type === "multi_select" && field.is_ranked ? (
              <div className="space-y-3">
                {multiValue.map((option, index) => (
                  <div
                    key={option}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{option}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => {
                          if (index === 0) return
                          const nextValues = [...multiValue]
                          ;[nextValues[index - 1], nextValues[index]] = [nextValues[index], nextValues[index - 1]]
                          updateAnswer(field.key, nextValues)
                        }}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => {
                          if (index === multiValue.length - 1) return
                          const nextValues = [...multiValue]
                          ;[nextValues[index], nextValues[index + 1]] = [nextValues[index + 1], nextValues[index]]
                          updateAnswer(field.key, nextValues)
                        }}
                        disabled={index === multiValue.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {field.type === "rating" ? (
              field.scale_type === "stars" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {Array.from(
                      { length: Math.max(1, (field.scale_max ?? 5) - (field.scale_min ?? 1) + 1) },
                      (_, index) => (field.scale_min ?? 1) + index,
                    ).map((score) => {
                      const isActive = ratingValue !== null && score <= ratingValue
                      return (
                        <Button
                          key={score}
                          type="button"
                          variant="outline"
                          size="icon"
                          className={isActive ? "border-amber-300 bg-amber-50 text-amber-500" : ""}
                          onClick={() => updateAnswer(field.key, score)}
                        >
                          <Star className={`h-5 w-5 ${isActive ? "fill-current" : ""}`} />
                        </Button>
                      )
                    })}
                  </div>
                  {(field.min_label || field.max_label) ? (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{field.min_label}</span>
                      <span>{field.max_label}</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    id={field.key}
                    type="number"
                    min={field.scale_min ?? 1}
                    max={field.scale_max ?? 5}
                    step={field.allow_float ? 0.5 : 1}
                    value={ratingValue ?? ""}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      updateAnswer(field.key, nextValue === "" ? null : Number(nextValue))
                    }}
                    aria-invalid={Boolean(error)} aria-describedby={error ? `${field.key}-error` : undefined}
                    placeholder={`${field.scale_min ?? 1} to ${field.scale_max ?? 5}`}
                  />
                  {(field.min_label || field.max_label) ? (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{field.min_label}</span>
                      <span>{field.max_label}</span>
                    </div>
                  ) : null}
                </div>
              )
            ) : null}

            {field.type === "image" ? (
              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <Input
                  id={field.key}
                  type="file"
                  accept="image/*"
                  aria-invalid={Boolean(error)} aria-describedby={error ? `${field.key}-error` : undefined}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null

                    if (file && !file.type.startsWith("image/")) {
                      setImageSelection(field.key, null)
                      setErrors((previous) => ({ ...previous, [field.key]: "Please choose an image file." }))
                    } else {
                      setImageSelection(field.key, file)
                    }

                    event.currentTarget.value = ""
                  }}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  <span>{imageSelection ? imageSelection.fileName : "Choose an image file from your device."}</span>
                </div>
                {uploadingKeys.includes(field.key) ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading image...
                  </div>
                ) : null}
                {imageSelection ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-background p-3">
                    <img src={imageSelection.previewUrl} alt={field.label} className="max-h-64 w-full object-contain" />
                  </div>
                ) : null}
              </div>
            ) : null}

            {field.type === "boolean" ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40">
                <Checkbox
                  checked={answers[field.key] === true}
                  onCheckedChange={(checked) => updateAnswer(field.key, checked === true)}
                />
                <div className="space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    {field.label}
                    {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                  </span>
                </div>
              </label>
            ) : null}

            {error ? <p id={`${field.key}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}
          </div>
        )
      })}

      <div className="flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Fields marked with * are required.</p>
        <Button type="submit" size="lg" disabled={isSubmitting || uploadingKeys.length > 0}>
          {uploadingKeys.length > 0 ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading images...
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Form"
          )}
        </Button>
      </div>
    </form>
  )
}

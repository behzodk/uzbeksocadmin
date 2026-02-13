"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { Form, FormField, FormSchema, FormFieldType } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowDown, ArrowLeft, ArrowUp, Eye, Edit3, Plus, Trash2, Star } from "lucide-react"

interface EventOption {
  id: string
  title: string
}

interface FormEditorProps {
  form: Form | null
  events: EventOption[]
  linkedEventIds: string[]
}

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi Select" },
  { value: "boolean", label: "Boolean" },
  { value: "rating", label: "Rating" },
]

const createFieldId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `field_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

const normalizeSchema = (schema: FormSchema | null | undefined): FormSchema => {
  if (!schema || !Array.isArray(schema.fields)) {
    return { fields: [] }
  }
  const normalized = schema.fields.map((field) => {
    const conditional =
      field && typeof field === "object" && "conditional" in field ? (field as FormField).conditional : undefined

    return {
      ...field,
      id: field.id || createFieldId(),
      required: Boolean(field.required),
      order: typeof field.order === "number" ? field.order : undefined,
      conditional:
        conditional && conditional.field_key && conditional.option
          ? { field_key: conditional.field_key, option: conditional.option }
          : undefined,
    }
  })
  return {
    fields: normalized.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  }
}

export function FormEditor({ form, events, linkedEventIds }: FormEditorProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("edit")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialSnapshotRef = useRef<string | null>(null)

  const [formMeta, setFormMeta] = useState({
    title: form?.title || "",
    slug: form?.slug || "",
    is_active: form?.is_active ?? true,
    event_id: form?.event_id || "",
  })

  const [fields, setFields] = useState<FormField[]>(() => normalizeSchema(form?.schema).fields)
  const [previewValues, setPreviewValues] = useState<Record<string, string | boolean | string[] | number>>({})

  const trimOptions = (options?: string[]) => (options || []).map((opt) => opt.trim()).filter(Boolean)

  const ensureValidConditionals = (nextFields: FormField[]) =>
    nextFields.map((field, index) => {
      if (!field.conditional) return field

      const parentIndex = nextFields.findIndex(
        (candidate, candidateIndex) => candidateIndex < index && candidate.key === field.conditional?.field_key
      )
      const parent = parentIndex >= 0 ? nextFields[parentIndex] : null
      const option = field.conditional?.option?.trim() || ""
      const parentKey = parent?.key?.trim() || ""
      const parentOptions = trimOptions(parent?.options)

      if (!parent || parent.type !== "select" || !parentKey || !option || !parentOptions.includes(option)) {
        const { conditional: _ignored, ...rest } = field
        return { ...rest }
      }

      return { ...field, conditional: { field_key: parentKey, option } }
    })

  const updateFields = (updater: (prev: FormField[]) => FormField[]) => {
    setFields((prev) => ensureValidConditionals(updater(prev)))
  }

  useEffect(() => {
    setFields((prev) => ensureValidConditionals(prev))
  }, [])

  useEffect(() => {
    if (!form && formMeta.title && !formMeta.slug) {
      setFormMeta((prev) => ({ ...prev, slug: slugify(prev.title) }))
    }
  }, [form, formMeta.slug, formMeta.title])

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      meta: {
        title: formMeta.title,
        slug: formMeta.slug,
        is_active: formMeta.is_active,
        event_id: formMeta.event_id || null,
      },
      fields: fields.map((field, index) => ({
        id: field.id,
        type: field.type,
        label: field.label,
        key: field.key,
        required: field.required,
        options: field.options || [],
        is_ranked: field.is_ranked || false,
        order: index + 1,
        min_count: field.min_count ?? null,
        max_count: field.max_count ?? null,
        scale_min: field.scale_min ?? null,
        scale_max: field.scale_max ?? null,
        scale_type: field.scale_type || null,
        allow_float: field.allow_float ?? false,
        min_label: field.min_label ?? null,
        max_label: field.max_label ?? null,

        conditional: field.conditional || null,
        is_student_email: field.is_student_email || false,
      })),
    })
  }, [fields, formMeta.event_id, formMeta.is_active, formMeta.slug, formMeta.title])

  useEffect(() => {
    if (!initialSnapshotRef.current) {
      initialSnapshotRef.current = currentSnapshot
    }
  }, [currentSnapshot])

  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false
    return initialSnapshotRef.current !== currentSnapshot
  }, [currentSnapshot])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ""
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirty) return
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const anchor = target?.closest("a") as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return
      if (!anchor.href) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      const confirmLeave = window.confirm("You have unsaved changes. Are you sure you want to leave this page?")
      if (!confirmLeave) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("click", handleDocumentClick, true)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("click", handleDocumentClick, true)
    }
  }, [isDirty])

  const fieldsPreview = useMemo(() => fields.filter((field) => field.label && field.key), [fields])
  const visiblePreviewFields = useMemo(() => {
    return fieldsPreview.filter((field) => {
      if (!field.conditional) return true
      const currentIndex = fields.findIndex((candidate) => candidate.id === field.id)
      const parentIndex = fields.findIndex(
        (candidate, candidateIndex) =>
          candidateIndex < currentIndex && candidate.key === field.conditional?.field_key
      )
      if (parentIndex === -1) return false
      const selectedValue = previewValues[field.conditional.field_key]
      return selectedValue === field.conditional.option
    })
  }, [fields, fieldsPreview, previewValues])

  const handleAddField = () => {
    updateFields((prev) => [
      ...prev,
      {
        id: createFieldId(),
        type: "text",
        label: "",
        key: "",
        required: false,
        is_ranked: false,
        min_count: null,
        max_count: 255,
        options: [],
      },
    ])
  }

  const handlePreviewSelectChange = (key: string, value: string) => {
    setPreviewValues((prev) => {
      const next = { ...prev, [key]: value }
      fields.forEach((field) => {
        if (field.conditional?.field_key === key && field.conditional.option !== value) {
          delete next[field.key]
        }
      })
      return next
    })
  }

  const handlePreviewRatingChange = (key: string, value: number) => {
    setPreviewValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleUpdateField = (index: number, updates: Partial<FormField>) => {
    updateFields((prev) => prev.map((field, i) => (i === index ? { ...field, ...updates } : field)))
  }

  const handleInsertFieldAfter = (index: number) => {
    updateFields((prev) => {
      const next = [...prev]
      next.splice(index + 1, 0, {
        id: createFieldId(),
        type: "text",
        label: "",
        key: "",
        required: false,
        is_ranked: false,
        min_count: null,
        max_count: 255,
        options: [],
      })
      return next
    })
  }

  const handleRemoveField = (index: number) => {
    updateFields((prev) => prev.filter((_, i) => i !== index))
  }

  const moveField = (fromIndex: number, toIndex: number) => {
    updateFields((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const validateFields = () => {
    if (!formMeta.title.trim()) return "Form title is required."
    if (!formMeta.slug.trim()) return "Slug is required."
    if (fields.length === 0) return "Add at least one field to the form."

    const keys = new Set<string>()
    for (let index = 0; index < fields.length; index += 1) {
      const field = fields[index]
      if (!field.label.trim()) return "Every field must have a label."
      if (!field.key.trim()) return "Every field must have a key."
      if (keys.has(field.key.trim())) return `Duplicate field key: ${field.key}`
      keys.add(field.key.trim())

      if (field.type === "select" || field.type === "multi_select") {
        const trimmedOptions = trimOptions(field.options)
        if (trimmedOptions.length === 0) {
          return "Select and multi-select fields must have at least one option."
        }
      }

      if (field.type === "text") {
        const min = field.min_count ?? null
        const max = field.max_count ?? null
        if (min !== null && min < 0) return "Text min_count must be 0 or greater."
        if (max !== null && max < 0) return "Text max_count must be 0 or greater."
        if (min !== null && max !== null && min > max) return "Text min_count cannot exceed max_count."
      }

      if (field.type === "rating") {
        const min = field.scale_min ?? null
        const max = field.scale_max ?? null
        if (min === null || max === null || Number.isNaN(min) || Number.isNaN(max))
          return `Rating field "${field.label || field.key}" needs numeric scale min and max.`
        if (min >= max) return `Rating scale min must be less than max for "${field.label || field.key}".`
        if (!field.scale_type) return `Choose a scale type for rating field "${field.label || field.key}".`
      }

      if (field.conditional) {
        const parentIndex = fields.findIndex(
          (candidate, candidateIndex) =>
            candidateIndex < index &&
            candidate.key.trim() === field.conditional?.field_key.trim()
        )
        if (parentIndex === -1) {
          return `Conditional field "${field.label}" must depend on a select field above it.`
        }

        const parent = fields[parentIndex]
        if (parent.type !== "select") {
          return `Conditional field "${field.label}" must depend on a select field above it.`
        }

        const parentOptions = trimOptions(parent.options)
        const optionValue = field.conditional.option?.trim()
        if (!optionValue) {
          return `Choose the option that reveals "${field.label}".`
        }

        if (!parentOptions.includes(optionValue)) {
          return `Conditional option for "${field.label}" must be one of "${parent.label}" options.`
        }
      }
    }

    return null
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    const validationError = validateFields()
    if (validationError) {
      setError(validationError)
      setIsSaving(false)
      return
    }

    const cleanedFields: FormField[] = fields.map((field, index) => {
      const options = field.type === "select" || field.type === "multi_select" ? trimOptions(field.options) : undefined
      const conditional =
        field.conditional && field.conditional.field_key && field.conditional.option
          ? { field_key: field.conditional.field_key.trim(), option: field.conditional.option.trim() }
          : undefined
      return {
        ...field,
        key: field.key.trim(),
        label: field.label.trim(),
        options,
        is_ranked: field.type === "multi_select" ? Boolean(field.is_ranked) : undefined,
        order: index + 1,
        min_count: field.type === "text" ? field.min_count ?? null : undefined,
        max_count: field.type === "text" ? field.max_count ?? null : undefined,
        scale_min: field.type === "rating" ? field.scale_min ?? null : undefined,
        scale_max: field.type === "rating" ? field.scale_max ?? null : undefined,
        scale_type: field.type === "rating" ? field.scale_type ?? "numeric" : undefined,
        allow_float: field.type === "rating" ? Boolean(field.allow_float) : undefined,
        min_label:
          field.type === "rating"
            ? (field.min_label ?? "").trim() || null
            : undefined,

        max_label:
          field.type === "rating"
            ? (field.max_label ?? "").trim() || null
            : undefined,
        conditional,
        is_student_email: field.type === "email" ? Boolean(field.is_student_email) : undefined,
      }
    })

    const payload = {
      title: formMeta.title.trim(),
      slug: formMeta.slug.trim(),
      is_active: formMeta.is_active,
      event_id: formMeta.event_id || null,
      schema: { fields: cleanedFields } satisfies FormSchema,
    }

    const supabase = getSupabaseBrowserClient()

    if (form) {
      const { data, error: updateError } = await supabase
        .from("forms")
        .update(payload)
        .eq("id", form.id)
        .select("*")
        .single()

      if (updateError || !data) {
        setError(updateError?.message || "Failed to update form.")
        setIsSaving(false)
        return
      }
    } else {
      const { error: insertError } = await supabase.from("forms").insert(payload)

      if (insertError) {
        setError(insertError.message || "Failed to create form.")
        setIsSaving(false)
        return
      }
    }

    setIsSaving(false)
    initialSnapshotRef.current = currentSnapshot
    router.push("/dashboard/forms")
    router.refresh()
  }

  const handleExit = () => {
    if (isDirty) {
      const confirmLeave = window.confirm("You have unsaved changes. Are you sure you want to leave this page?")
      if (!confirmLeave) return
    }
    router.push("/dashboard/forms")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleExit}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{form ? "Edit Form" : "Create Form"}</h1>
              <p className="text-sm text-muted-foreground">
                {form ? `Editing: ${form.title}` : "Create a form for registrations"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="edit" className="gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? "Saving..." : form ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6">
        {activeTab === "edit" ? (
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Cannot save form</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Form Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="form-title">Title</Label>
                    <Input
                      id="form-title"
                      value={formMeta.title}
                      onChange={(e) => setFormMeta((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Event registration form"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="form-slug">Slug</Label>
                    <Input
                      id="form-slug"
                      value={formMeta.slug}
                      onChange={(e) => setFormMeta((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="event-registration"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="form-event">Linked Event (optional)</Label>
                    <Select
                      value={formMeta.event_id || "none"}
                      onValueChange={(value) =>
                        setFormMeta((prev) => ({ ...prev, event_id: value === "none" ? "" : value }))
                      }
                    >
                      <SelectTrigger id="form-event">
                        <SelectValue placeholder="No event linked" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No event</SelectItem>
                        {events.map((event) => {
                          const isTaken = linkedEventIds.includes(event.id) && event.id !== form?.event_id
                          return (
                            <SelectItem key={event.id} value={event.id} disabled={isTaken}>
                              {event.title}
                              {isTaken ? " (already used)" : ""}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="form-active" className="text-sm font-medium">
                        Active
                      </Label>
                      <p className="text-xs text-muted-foreground">Enable or disable submissions</p>
                    </div>
                    <Switch
                      id="form-active"
                      checked={formMeta.is_active}
                      onCheckedChange={(checked) => setFormMeta((prev) => ({ ...prev, is_active: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Fields</CardTitle>
                <Button variant="outline" onClick={handleAddField} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Field
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                    No fields added yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const selectAncestors = fields
                        .slice(0, index)
                        .filter((candidate) => candidate.type === "select" && candidate.key.trim())
                      const selectAncestorsWithOptions = selectAncestors.filter(
                        (candidate) => trimOptions(candidate.options).length > 0
                      )
                      const currentConditionalParent = field.conditional
                        ? selectAncestors.find((candidate) => candidate.key === field.conditional?.field_key)
                        : undefined
                      const conditionalOptions = currentConditionalParent ? trimOptions(currentConditionalParent.options) : []
                      const canBeConditional = selectAncestors.length > 0

                      return (
                        <Card key={field.id} className="border-dashed">
                          <CardContent className="space-y-4 pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Move field up"
                                  onClick={() => moveField(index, index - 1)}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Move field down"
                                  onClick={() => moveField(index, index + 1)}
                                  disabled={index === fields.length - 1}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <p className="text-sm font-semibold">Field {index + 1}</p>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveField(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Label</Label>
                                <Input
                                  value={field.label}
                                  onChange={(e) => {
                                    const label = e.target.value
                                    const updates: Partial<FormField> = { label }

                                    // Auto-serialize key if it matches the previous label's slug or is empty
                                    // This allows users to lock the key by manually editing it to something else
                                    const currentSlug = slugify(field.label)
                                    if (!field.key || field.key === currentSlug) {
                                      updates.key = slugify(label)
                                    }

                                    if (field.type === "text" && label.toLowerCase().includes("email")) {
                                      updates.type = "email"
                                    }

                                    handleUpdateField(index, updates)
                                  }}
                                  placeholder="Full name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Key</Label>
                                <Input
                                  value={field.key}
                                  onChange={(e) => handleUpdateField(index, { key: e.target.value })}
                                  placeholder="full_name"
                                />
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                  value={field.type}
                                  onValueChange={(value: FormFieldType) =>
                                    handleUpdateField(index, {
                                      type: value,
                                      options: value === "select" || value === "multi_select" ? field.options || [] : [],
                                      is_ranked: value === "multi_select" ? field.is_ranked ?? false : false,
                                      min_count: value === "text" ? field.min_count ?? null : null,
                                      max_count: value === "text" ? field.max_count ?? null : null,
                                      scale_min: value === "rating" ? field.scale_min ?? 1 : undefined,
                                      scale_max: value === "rating" ? field.scale_max ?? 5 : undefined,
                                      scale_type: value === "rating" ? field.scale_type ?? "numeric" : undefined,
                                      allow_float: value === "rating" ? field.allow_float ?? false : undefined,
                                      min_label: value === "rating" ? field.min_label ?? "" : undefined,
                                      max_label: value === "rating" ? field.max_label ?? "" : undefined,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FIELD_TYPES.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
                                <div>
                                  <Label className="text-sm font-medium">Required</Label>
                                  <p className="text-xs text-muted-foreground">Field must be completed</p>
                                </div>
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(checked) => handleUpdateField(index, { required: checked })}
                                />
                              </div>
                            </div>

                            {field.type === "text" && (
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Min Count</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={field.min_count ?? ""}
                                    onChange={(e) =>
                                      handleUpdateField(index, {
                                        min_count: e.target.value === "" ? null : Number(e.target.value),
                                      })
                                    }
                                    placeholder="0"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Max Count</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={field.max_count ?? ""}
                                    onChange={(e) =>
                                      handleUpdateField(index, {
                                        max_count: e.target.value === "" ? null : Number(e.target.value),
                                      })
                                    }
                                    placeholder="100"
                                  />
                                </div>
                              </div>
                            )}

                            {field.type === "email" && (
                              <div className="flex items-center gap-2 rounded-lg border p-3">
                                <div>
                                  <Label className="text-sm font-medium">Student Email Only</Label>
                                  <p className="text-xs text-muted-foreground">Restrict to @student.bham.ac.uk addresses</p>
                                </div>
                                <Switch
                                  checked={Boolean(field.is_student_email)}
                                  onCheckedChange={(checked) => handleUpdateField(index, { is_student_email: checked })}
                                />
                              </div>
                            )}

                            {(field.type === "select" || field.type === "multi_select") && (
                              <div className="space-y-2">
                                <Label>Options (one per line)</Label>
                                <Textarea
                                  value={(field.options || []).join("\n")}
                                  onChange={(e) =>
                                    handleUpdateField(index, {
                                      options: e.target.value.split("\n"),
                                    })
                                  }
                                  placeholder={"Option A\nOption B\nOption C"}
                                  rows={4}
                                />
                                {field.type === "multi_select" && (
                                  <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                      <Label className="text-sm font-medium">Ranked Selection</Label>
                                      <p className="text-xs text-muted-foreground">Respondents order their choices</p>
                                    </div>
                                    <Switch
                                      checked={Boolean(field.is_ranked)}
                                      onCheckedChange={(checked) => handleUpdateField(index, { is_ranked: checked })}
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {field.type === "rating" && (
                              <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-3">
                                  <div className="space-y-2">
                                    <Label>Scale Min</Label>
                                    <Input
                                      type="number"
                                      value={field.scale_min ?? 1}
                                      onChange={(e) =>
                                        handleUpdateField(index, {
                                          scale_min: e.target.value === "" ? null : Number(e.target.value),
                                        })
                                      }
                                      placeholder="1"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Scale Max</Label>
                                    <Input
                                      type="number"
                                      value={field.scale_max ?? 5}
                                      onChange={(e) =>
                                        handleUpdateField(index, {
                                          scale_max: e.target.value === "" ? null : Number(e.target.value),
                                        })
                                      }
                                      placeholder="5"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Scale Type</Label>
                                    <Select
                                      value={field.scale_type || "numeric"}
                                      onValueChange={(value) =>
                                        handleUpdateField(index, {
                                          scale_type: value as "numeric" | "stars",
                                          allow_float: value === "numeric" ? field.allow_float ?? false : false,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="numeric">Numeric</SelectItem>
                                        <SelectItem value="stars">Stars</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {field.scale_type === "numeric" && (
                                  <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                      <Label className="text-sm font-medium">Allow decimals</Label>
                                      <p className="text-xs text-muted-foreground">Let respondents submit fractional values.</p>
                                    </div>
                                    <Switch
                                      checked={Boolean(field.allow_float)}
                                      onCheckedChange={(checked) => handleUpdateField(index, { allow_float: checked })}
                                    />
                                  </div>
                                )}

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Min Label (optional)</Label>
                                    <Input
                                      value={field.min_label ?? ""}
                                      onChange={(e) => handleUpdateField(index, { min_label: e.target.value })}
                                      placeholder="Poor"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Max Label (optional)</Label>
                                    <Input
                                      value={field.max_label ?? ""}
                                      onChange={(e) => handleUpdateField(index, { max_label: e.target.value })}
                                      placeholder="Excellent"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="rounded-lg border p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-sm font-medium">Conditional visibility</Label>
                                  <p className="text-xs text-muted-foreground">
                                    {canBeConditional
                                      ? "Show this field only when a select option above is chosen."
                                      : "Add a select field above (not multi-select) to enable conditions."}
                                  </p>
                                </div>
                                <Switch
                                  disabled={!selectAncestorsWithOptions.length}
                                  checked={Boolean(field.conditional)}
                                  onCheckedChange={(checked) => {
                                    if (!checked) {
                                      handleUpdateField(index, { conditional: undefined })
                                      return
                                    }
                                    const parent = selectAncestorsWithOptions[0]
                                    const parentOptions = trimOptions(parent?.options)
                                    const firstOption = parentOptions[0]
                                    handleUpdateField(index, {
                                      conditional:
                                        parent && parent.key && firstOption
                                          ? { field_key: parent.key.trim(), option: firstOption }
                                          : undefined,
                                    })
                                  }}
                                />
                              </div>

                              {field.conditional && canBeConditional && (
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Depends on select</Label>
                                    <Select
                                      value={currentConditionalParent?.key || field.conditional.field_key}
                                      onValueChange={(value) => {
                                        const parent = selectAncestors.find((candidate) => candidate.key === value)
                                        const parentOptions = trimOptions(parent?.options)
                                        const defaultOption = parentOptions[0]
                                        handleUpdateField(index, {
                                          conditional:
                                            parent && defaultOption ? { field_key: value, option: defaultOption } : undefined,
                                        })
                                      }}
                                      disabled={!selectAncestorsWithOptions.length}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select field above" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {selectAncestors.map((candidate) => (
                                          <SelectItem key={candidate.id} value={candidate.key}>
                                            {candidate.label || candidate.key}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Show when option is</Label>
                                    <Select
                                      value={field.conditional?.option}
                                      onValueChange={(value) =>
                                        handleUpdateField(index, {
                                          conditional: field.conditional
                                            ? { field_key: field.conditional.field_key, option: value }
                                            : undefined,
                                        })
                                      }
                                      disabled={!conditionalOptions.length}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select option" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {conditionalOptions.map((option) => (
                                          <SelectItem key={option} value={option}>
                                            {option}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {!conditionalOptions.length && (
                                      <p className="text-xs text-muted-foreground">
                                        Add at least one option to the selected parent field.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {!selectAncestorsWithOptions.length && canBeConditional && (
                                <p className="text-xs text-muted-foreground">
                                  Add options to the select field above to enable conditions.
                                </p>
                              )}
                            </div>

                            <div className="flex justify-end">
                              <Button variant="outline" size="sm" onClick={() => handleInsertFieldAfter(index)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add field below
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{formMeta.title || "Untitled Form"}</h2>
                <p className="text-sm text-muted-foreground">/{formMeta.slug || "form-slug"}</p>
              </div>

              <div className="space-y-4">
                {fieldsPreview.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                    Add fields to see a preview.
                  </div>
                ) : (
                  visiblePreviewFields.map((field) => {
                    const previewOptions = trimOptions(field.options)
                    const selectValue = typeof previewValues[field.key] === "string" ? (previewValues[field.key] as string) : undefined
                    const ratingValue =
                      typeof previewValues[field.key] === "number" ? (previewValues[field.key] as number) : undefined
                    const ratingMin = Number.isFinite(field.scale_min) ? (field.scale_min as number) : 1
                    const ratingMax = Number.isFinite(field.scale_max) ? (field.scale_max as number) : 5
                    const ratingStep = field.allow_float ? 0.1 : 1
                    return (
                      <div key={field.id} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          {field.label}
                          {field.required && <span className="text-xs text-destructive">*</span>}
                        </Label>
                        {field.type === "text" && <Input placeholder={field.label} />}
                        {field.type === "email" && <Input type="email" placeholder="name@example.com" />}
                        {field.type === "select" && (
                          <Select value={selectValue} onValueChange={(value) => handlePreviewSelectChange(field.key, value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {previewOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {field.type === "multi_select" && (
                          <div className="space-y-2">
                            {previewOptions.map((option) => (
                              <label key={option} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" className="h-4 w-4 rounded border-muted" disabled />
                                {option}
                              </label>
                            ))}
                          </div>
                        )}
                        {field.type === "rating" && (
                          <div className="space-y-2">
                            {field.scale_type === "stars" ? (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.max(1, Math.min(15, ratingMax - ratingMin + 1)) }).map((_, starIndex) => {
                                  const value = ratingMin + starIndex
                                  const filled = (ratingValue ?? 0) >= value
                                  return (
                                    <Star
                                      key={value}
                                      className={`h-5 w-5 ${filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                                    />
                                  )
                                })}
                              </div>
                            ) : (
                              <Input
                                type="number"
                                step={ratingStep}
                                min={ratingMin}
                                max={ratingMax}
                                value={ratingValue ?? ""}
                                placeholder={`${ratingMin} – ${ratingMax}`}
                                onChange={(e) => {
                                  const next = e.target.value === "" ? undefined : Number(e.target.value)
                                  if (next === undefined || Number.isFinite(next)) handlePreviewRatingChange(field.key, next ?? ratingMin)
                                }}
                              />
                            )}
                            {(field.min_label || field.max_label) && (
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{field.min_label}</span>
                                <span>{field.max_label}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {field.type === "boolean" && (
                          <div className="flex items-center gap-2">
                            <Switch checked={false} />
                            <span className="text-sm text-muted-foreground">Toggle</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div >
  )
}

import type { FormField } from "@/lib/types"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STUDENT_EMAIL_DOMAIN = "student.bham.ac.uk"

interface ValidationOptions {
  studentEmailMode?: "username" | "address"
  hasSelectedImage?: boolean
}

/** Shared browser/API rules. The API receives full student addresses and uploaded image answers. */
export function validateFormField(field: FormField, value: unknown, options: ValidationOptions = {}): string | null {
  if (field.type === "content") return null

  if (field.type === "image") {
    if (options.hasSelectedImage !== undefined) {
      return field.required && !options.hasSelectedImage ? "Please choose an image." : null
    }
    if (value === undefined || value === null || value === "") {
      return field.required ? "Please choose an image." : null
    }
    const url = typeof value === "string"
      ? value
      : typeof value === "object" && "url" in value ? value.url : null
    if (typeof url !== "string") return "Please provide a valid image."
    try {
      if (!["https:", "http:"].includes(new URL(url).protocol)) return "Please provide a valid image."
    } catch {
      return "Please provide a valid image."
    }
    return null
  }

  if (field.type === "multi_select") {
    if (value != null && !Array.isArray(value)) return "Please choose valid options."
    const selected = Array.isArray(value) ? value : []
    const allowed = (field.options || []).map((option) => option.trim()).filter(Boolean)
    if (selected.some((item) => typeof item !== "string" || !allowed.includes(item)) || new Set(selected).size !== selected.length) {
      return "Please choose valid options without duplicates."
    }
    if (field.required && selected.length === 0) {
      return field.is_ranked ? "Please rank at least one option." : "Please choose at least one option."
    }
    if (field.min_count != null && selected.length < field.min_count) {
      return `Please choose at least ${field.min_count} option${field.min_count === 1 ? "" : "s"}.`
    }
    if (field.max_count != null && selected.length > field.max_count) {
      return `Please choose no more than ${field.max_count} option${field.max_count === 1 ? "" : "s"}.`
    }
    return null
  }

  if (field.type === "rating") {
    if (value === null || value === undefined || value === "") return field.required ? "Please provide a rating." : null
    if (typeof value !== "number" || !Number.isFinite(value)) return "Please provide a valid rating."
    const min = field.scale_min ?? 1
    const max = field.scale_max ?? 5
    if (value < min || value > max) return `Please choose a value between ${min} and ${max}.`
    if (!field.allow_float && !Number.isInteger(value)) return "Please choose a whole number."
    return null
  }

  if (field.type === "boolean") {
    if (value != null && typeof value !== "boolean") return "Please provide a valid checkbox value."
    return field.required && value !== true ? "This checkbox is required." : null
  }

  if (value != null && typeof value !== "string") return "Please enter a valid text value."
  const text = typeof value === "string" ? value.trim() : ""

  if (field.type === "select") {
    if (field.required && !text) return "Please select an option."
    const allowed = (field.options || []).map((option) => option.trim()).filter(Boolean)
    if (text && !allowed.includes(text)) return "Please select a valid option."
    return null
  }

  if (field.type === "email") {
    if (!text) return field.required ? "Email is required." : null
    if (field.is_student_email) {
      const address = options.studentEmailMode === "username" ? `${text}@${STUDENT_EMAIL_DOMAIN}` : text
      if (!EMAIL_PATTERN.test(address) || address.slice(address.lastIndexOf("@") + 1).toLowerCase() !== STUDENT_EMAIL_DOMAIN) {
        return options.studentEmailMode === "username"
          ? "Enter a valid university username only."
          : `Please use an @${STUDENT_EMAIL_DOMAIN} email address.`
      }
      return null
    }
    if (!EMAIL_PATTERN.test(text)) return "Please enter a valid email address."
  }

  if (field.required && !text) return "This field is required."
  if (field.min_count != null && text.length < field.min_count) return `Please enter at least ${field.min_count} characters.`
  if (field.max_count != null && text.length > field.max_count) return `Please enter no more than ${field.max_count} characters.`
  return null
}

import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseFormImageAnswer } from "@/lib/form-image-storage"
import { getSortedFormFields, isAnswerableFormField } from "@/lib/form-schema"
import type { Form, FormField } from "@/lib/types"
import type { FormResponseRecord } from "@/lib/form-results"

const serializeCellValue = (value: unknown, field: FormField) => {
  if (value === null || value === undefined || value === "") return ""
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.length ? value.map((item) => String(item)).join(", ") : ""
  if (field.type === "image") return parseFormImageAnswer(value)?.url || ""
  if (typeof value === "object") return JSON.stringify(value)
  if (field.type === "email") return String(value).toLowerCase()
  return String(value)
}

const formatCellValue = (value: unknown, field: FormField) => {
  const serialized = serializeCellValue(value, field)
  if (!serialized) return ""
  if (field.is_secure) return "*".repeat(serialized.length)
  return serialized
}

const sanitizeSheetName = (value: string) => value.replace(/[\\/*?:[\]]/g, "_").slice(0, 31) || "Results"

const sanitizeFilenameBase = (value: string) => value.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "form-results"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = getSupabaseAdminClient()

  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("id, slug, title, is_active, max_response, schema, event_id, created_at")
    .eq("id", id)
    .single()

  if (formError || !form) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 })
  }

  const { data: responses, error: responseError } = await supabase
    .from("form_submissions")
    .select("id, form_id, status, answers, created_at")
    .eq("form_id", form.id)
    .order("created_at", { ascending: false })

  if (responseError || !responses) {
    return NextResponse.json({ error: "Failed to load responses." }, { status: 500 })
  }

  const typedForm = form as Form
  const typedResponses = responses as FormResponseRecord[]
  const fields = getSortedFormFields(typedForm).filter(isAnswerableFormField)

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sanitizeSheetName(typedForm.title))

  const columns = [
    { header: "Submitted At", key: "submittedAt", width: 22 },
    { header: "Status", key: "status", width: 14 },
    ...fields.map((field) => ({ header: field.label, key: field.key, width: 28 })),
  ]
  worksheet.columns = columns

  typedResponses.forEach((response) => {
    const row: Record<string, string> = {
      submittedAt: new Date(response.created_at).toLocaleString("en-GB"),
      status: String(response.status || ""),
    }

    fields.forEach((field) => {
      row[field.key] = formatCellValue(response.answers?.[field.key], field)
    })

    worksheet.addRow(row)
  })

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } }
  headerRow.alignment = { horizontal: "center", vertical: "middle" }

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      }
      cell.alignment = { vertical: "top", wrapText: true }
    })
  })

  worksheet.views = [{ state: "frozen", ySplit: 1 }]
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `${sanitizeFilenameBase(typedForm.title)}-${typedForm.id}-results.xlsx`

  return new NextResponse(buffer as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

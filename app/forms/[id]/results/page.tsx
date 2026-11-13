import { notFound } from "next/navigation"
import { Download, ClipboardList } from "lucide-react"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { getSortedFormFields, isAnswerableFormField } from "@/lib/form-schema"
import { buildPublicResultsRows, type PublicResultsField } from "@/lib/results-workspace"
import type { Form } from "@/lib/types"
import type { FormResponseRecord } from "@/lib/form-results"
import { PublicResultsTable } from "./public-results-table"
import "./results-workspace.css"

export const dynamic = "force-dynamic"
async function getPublicFormResults(id: string) {
  const supabase = getSupabaseAdminClient()
  const { data: byId } = await supabase
    .from("forms")
    .select("id, slug, title, schema, max_response")
    .eq("id", id)
    .maybeSingle()
  const form =
    byId ||
    (
      await supabase
        .from("forms")
        .select("id, slug, title, schema, max_response")
        .eq("slug", id)
        .maybeSingle()
    ).data
  if (!form) return null
  const { data, error } = await supabase
    .from("form_submissions")
    .select("id, form_id, status, answers, created_at")
    .eq("form_id", form.id)
    .order("created_at", { ascending: false })
  if (error || !data) return null
  return { form: form as Form, responses: data as FormResponseRecord[] }
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getPublicFormResults(id)
  return {
    title: data ? `${data.form.title} · Responses` : "Form results",
    description: "Form submission records and response insights.",
  }
}
export default async function PublicFormResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getPublicFormResults(id)
  if (!data) notFound()
  const { form, responses } = data
  const schemaFields = getSortedFormFields(form).filter(isAnswerableFormField)
  const fields: PublicResultsField[] = schemaFields.map((field) => ({
    id: field.id,
    key: field.key,
    label: field.label,
    type: field.type,
    isSecure: Boolean(field.is_secure),
    isRanked: field.type === "multi_select" && Boolean(field.is_ranked),
  }))
  const rows = buildPublicResultsRows(schemaFields, responses)
  return (
    <div className="results-workspace">
      <header className="results-appbar">
        <div className="results-appbar-inner">
          <div className="results-identity">
            <span className="results-app-icon">
              <ClipboardList size={20} />
            </span>
            <div>
              <h1>{form.title}</h1>
              <p>Responses</p>
            </div>
          </div>
          <a
            className="results-export"
            href={`/forms/${form.id}/results/export`}
            title="Download all responses as an Excel workbook"
          >
            <Download size={17} />
            <span>Download Excel</span>
          </a>
        </div>
      </header>
      <main className="results-main">
        <PublicResultsTable fields={fields} rows={rows} capacity={form.max_response} now={Date.now()} />
      </main>
      <footer className="results-footer">
        These form results may be used solely for event management by the currently elected Committee members
        of the Uzbek Society at the University of Birmingham.
      </footer>
    </div>
  )
}

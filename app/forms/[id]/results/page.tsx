import { notFound } from "next/navigation"
import { BarChart3, CalendarDays, FileText, Table2 } from "lucide-react"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { buildPublicFormResults, type FormResponseRecord } from "@/lib/form-results"
import type { Form, FormField } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PageProps {
  params: Promise<{ id: string }>
}

const longDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

const getSortedFields = (form: Form) => [...(form.schema?.fields || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

const serializeCellValue = (value: unknown, field: FormField) => {
  if (value === null || value === undefined || value === "") {
    return ""
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (Array.isArray(value)) {
    return value.length ? value.map((item) => String(item)).join(", ") : ""
  }

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  if (field.type === "email") {
    return String(value).toLowerCase()
  }

  return String(value)
}

const formatCellValue = (value: unknown, field: FormField) => {
  const serialized = serializeCellValue(value, field)

  if (!serialized) {
    return "—"
  }

  if (field.is_secure) {
    return "*".repeat(serialized.length)
  }

  return serialized
}

async function getPublicFormResults(id: string) {
  const supabase = getSupabaseAdminClient()
  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("id, slug, title, is_active, max_response, schema, event_id, created_at")
    .eq("id", id)
    .eq("is_active", true)
    .single()

  if (formError || !form) {
    return null
  }

  const { data: responses, error: responseError } = await supabase
    .from("form_submissions")
    .select("id, form_id, status, answers, created_at")
    .eq("form_id", form.id)
    .order("created_at", { ascending: false })

  if (responseError || !responses) {
    return null
  }

  return {
    form: form as Form,
    responses: responses as FormResponseRecord[],
    results: buildPublicFormResults(form as Form, responses as FormResponseRecord[]),
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const data = await getPublicFormResults(id)

  if (!data) {
    return {
      title: "Form Results",
      description: "Public form results",
    }
  }

  return {
    title: `${data.form.title} Results`,
    description: `Public response summary for ${data.form.title}.`,
  }
}

function ResultBar({
  label,
  count,
  percentage,
  tone = "bg-primary",
}: {
  label: string
  count: number
  percentage: number
  tone?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-muted-foreground">
          {count} · {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(percentage, 3)}%` }} />
      </div>
    </div>
  )
}

export default async function PublicFormResultsPage({ params }: PageProps) {
  const { id } = await params
  const data = await getPublicFormResults(id)

  if (!data) {
    notFound()
  }

  const { form, responses, results } = data
  const fields = getSortedFields(form)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_40%),linear-gradient(180deg,rgba(248,250,252,1)_0%,rgba(255,255,255,1)_100%)]">
      <header className="border-b border-border/70 bg-background/95 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Public Results</p>
            <p className="mt-1 text-sm text-muted-foreground">Live summary of submitted responses</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <section className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div className="min-w-0 max-w-3xl space-y-5">
              <Badge className="px-3 py-1 text-[11px] uppercase tracking-[0.2em]">Form Results</Badge>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">{form.title}</h1>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  Aggregated public results for this form. Charts and summaries update as new responses come in.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Responses</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{results.totalResponses}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fields</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{fields.length}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Updated</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {results.latestResponse ? shortDate.format(new Date(results.latestResponse)) : "No data"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          <Card className="bg-card xl:col-span-2">
            <CardHeader>
              <CardTitle>Submission Timeline</CardTitle>
              <CardDescription>
                {results.latestResponse
                  ? `Most recent response on ${longDate.format(new Date(results.latestResponse))}.`
                  : "No responses have been submitted yet."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-muted/25 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-sm">Created</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">{shortDate.format(new Date(form.created_at))}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/25 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Form ID</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground break-all">{form.id}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/25 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm">Active Statuses</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">{results.statusCounts.length || 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
              <CardDescription>Distribution of submission states recorded for this form.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.statusCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submission status data yet.</p>
              ) : (
                results.statusCounts.map((status) => (
                  <ResultBar
                    key={status.label}
                    label={status.label}
                    count={status.count}
                    percentage={status.percentage}
                    tone="bg-slate-900"
                  />
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 space-y-4">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-foreground">Submission Records</h2>
            <p className="mt-2 text-muted-foreground">
              Each row represents a single submission. All form fields are shown as columns so you can review each
              person&apos;s record in one place.
            </p>
          </div>

          <Card className="overflow-hidden border-border/80 bg-card shadow-sm">
            <CardHeader className="border-b border-border/70 bg-muted/25">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Table2 className="h-4 w-4" />
                    </div>
                    <Badge variant="outline">Public Table</Badge>
                  </div>
                  <CardTitle className="text-xl leading-tight">All Submitted Records</CardTitle>
                  <CardDescription>
                    {responses.length} rows · {fields.length} form fields
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {responses.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">No responses yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/35">
                      <tr className="border-b border-border/70 align-top">
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Submitted
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Status
                        </th>
                        {fields.map((field) => (
                          <th
                            key={field.id}
                            className="min-w-[180px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                          >
                            <div className="space-y-1">
                              <span>{field.label}</span>
                              {field.is_secure && (
                                <div className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground/90">
                                  Masked publicly
                                </div>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((response, index) => (
                        <tr
                          key={response.id}
                          className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}
                        >
                          <td className="whitespace-nowrap border-b border-border/60 px-4 py-4 align-top font-medium text-foreground">
                            {dateTime.format(new Date(response.created_at))}
                          </td>
                          <td className="border-b border-border/60 px-4 py-4 align-top">
                            <Badge variant="secondary" className="capitalize">
                              {response.status}
                            </Badge>
                          </td>
                          {fields.map((field) => (
                            <td
                              key={`${response.id}-${field.id}`}
                              className="min-w-[180px] max-w-[320px] border-b border-border/60 px-4 py-4 align-top text-foreground"
                            >
                              <div className="whitespace-normal break-words leading-6">
                                {formatCellValue(response.answers?.[field.key], field)}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

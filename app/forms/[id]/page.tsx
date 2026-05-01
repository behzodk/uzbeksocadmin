import { FileText, Users } from "lucide-react"
import { notFound } from "next/navigation"
import { normalizeFormPartners } from "@/lib/form-partners"
import { getPublicFormById, isPublicFormFull } from "@/lib/public-forms"
import { PublicFormClient } from "@/components/forms/public-form-client"
import { PublicFormPartners } from "@/components/forms/public-form-partners"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const form = await getPublicFormById(id)

  if (!form) {
    return {
      title: "Form",
      description: "Public form",
    }
  }

  return {
    title: form.title,
    description: `Complete the public form for ${form.title}.`,
  }
}

export default async function PublicFormPage({ params }: PageProps) {
  const { id } = await params
  const form = await getPublicFormById(id)

  if (!form) {
    notFound()
  }

  const partners = normalizeFormPartners(form.partners)
  const isFull = isPublicFormFull(form)
  const remainingResponses = form.max_response === null ? null : Math.max(form.max_response - form.response_count, 0)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_40%),linear-gradient(180deg,rgba(248,250,252,1)_0%,rgba(255,255,255,1)_100%)]">
      <header className="border-b border-border/70 bg-background/95 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Public Form</p>
          <p className="mt-1 text-sm text-muted-foreground">Complete the form below and submit your response online.</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 md:py-14">
        <Card className="rounded-[2rem] border-border/70 shadow-sm">
          <CardContent className="space-y-8 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
              <div className="space-y-4">
                <Badge className="px-3 py-1 text-[11px] uppercase tracking-[0.2em]">Open Form</Badge>
                <div className="space-y-3">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">{form.title}</h1>
                  <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                    Review the details below, then fill in the required fields to send your response.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {!form.is_active ? "Closed" : isFull ? "Full" : "Open"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Availability</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {form.max_response === null ? "Unlimited" : isFull ? "Capacity reached" : `${remainingResponses} left`}
                  </p>
                </div>
              </div>
            </div>

            <PublicFormPartners partners={partners} />

            {!form.is_active ? (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-6">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-foreground">This form is currently unavailable</h2>
                    <p className="text-sm text-muted-foreground">
                      Responses are not being accepted right now. Please check back later.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {form.is_active && isFull ? (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-6">
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-foreground">This form has reached capacity</h2>
                    <p className="text-sm text-muted-foreground">
                      The maximum number of responses has been reached, so no further submissions are available.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {form.is_active && !isFull ? <PublicFormClient form={form} /> : null}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

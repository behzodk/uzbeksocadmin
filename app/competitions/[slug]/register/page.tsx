import Link from "next/link"
import { notFound } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { CompetitionRegistrationForm } from "./registration-form"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function CompetitionRegistrationPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await getSupabaseServerClient()

  const { data: competition, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("visibility", "public")
    .single()

  if (error || !competition) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href={`/competitions/${competition.slug}`}>
          <Button variant="ghost" className="mb-6 -ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Competition
          </Button>
        </Link>

        <CompetitionRegistrationForm competition={competition} />
      </div>
    </div>
  )
}

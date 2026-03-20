import { notFound } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { CompetitionRatingForm } from "./rating-form"

interface PageProps {
  params: Promise<{ ratingId: string }>
}

export default async function CompetitionRatingPage({ params }: PageProps) {
  const { ratingId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: entry, error: entryError } = await supabase
    .from("competition_entries")
    .select("*")
    .eq("rating_public_id", ratingId)
    .eq("status", "approved")
    .single()

  if (entryError || !entry) {
    notFound()
  }

  const { data: competition, error: competitionError } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", entry.competition_id)
    .eq("status", "published")
    .eq("visibility", "public")
    .single()

  if (competitionError || !competition) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <CompetitionRatingForm competition={competition} entry={entry} />
      </div>
    </div>
  )
}

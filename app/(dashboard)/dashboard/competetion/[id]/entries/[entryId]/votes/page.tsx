import { notFound } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { CompetitionEntryVotesClient } from "./votes-client"

interface PageProps {
  params: Promise<{ id: string; entryId: string }>
}

async function getCompetition(id: string) {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("competitions").select("*").eq("id", id).single()

  if (error) {
    return null
  }

  return data
}

async function getEntry(competitionId: string, entryId: string) {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("competition_entries")
    .select("*")
    .eq("competition_id", competitionId)
    .eq("id", entryId)
    .single()

  if (error) {
    return null
  }

  return data
}

async function getEntryRatings(competitionId: string, entryId: string) {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("competition_entry_ratings")
    .select("*")
    .eq("competition_id", competitionId)
    .eq("entry_id", entryId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching entry votes:", error)
    return []
  }

  return data
}

export default async function CompetitionEntryVotesPage({ params }: PageProps) {
  const { id, entryId } = await params
  const [competition, entry, ratings] = await Promise.all([
    getCompetition(id),
    getEntry(id, entryId),
    getEntryRatings(id, entryId),
  ])

  if (!competition || !entry) {
    notFound()
  }

  return <CompetitionEntryVotesClient competition={competition} entry={entry} ratings={ratings} />
}

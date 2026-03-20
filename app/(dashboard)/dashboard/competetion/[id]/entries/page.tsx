import { notFound } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { CompetitionEntriesClient } from "./entries-client"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getCompetition(id: string) {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return null
  }

  return data
}

async function getEntries(id: string) {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("competition_entries")
    .select("*")
    .eq("competition_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching competition entries:", error)
    return []
  }

  return data
}

async function getRatings(id: string) {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("competition_entry_ratings")
    .select("*")
    .eq("competition_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching competition ratings:", error)
    return []
  }

  return data
}

export default async function CompetitionEntriesPage({ params }: PageProps) {
  const { id } = await params
  const [competition, entries, ratings] = await Promise.all([getCompetition(id), getEntries(id), getRatings(id)])

  if (!competition) {
    notFound()
  }

  return <CompetitionEntriesClient competition={competition} initialEntries={entries} initialRatings={ratings} />
}

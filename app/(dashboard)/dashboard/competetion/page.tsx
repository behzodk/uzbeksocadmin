import { getSupabaseServerClient } from "@/lib/supabase/server"
import { CompetitionsClient } from "./competitions-client"

async function getCompetitions() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("competitions").select("*").order("start_date", { ascending: false })

  if (error) {
    console.error("Error fetching competitions:", error)
    return []
  }

  return data
}

export default async function CompetetionPage() {
  const competitions = await getCompetitions()

  return <CompetitionsClient initialCompetitions={competitions} />
}

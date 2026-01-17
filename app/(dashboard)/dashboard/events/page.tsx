import { getSupabaseServerClient } from "@/lib/supabase/server"
import { EventsClient } from "./events-client"

async function getEvents() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("events").select("*").order("start_date", { ascending: false })

  if (error) {
    console.error("Error fetching events:", error)
    return []
  }

  return data
}

export default async function EventsPage() {
  const events = await getEvents()

  return <EventsClient initialEvents={events} />
}

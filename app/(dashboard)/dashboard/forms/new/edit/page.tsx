import { getSupabaseServerClient } from "@/lib/supabase/server"
import { FormEditor } from "../../[id]/edit/form-editor"

async function getEvents() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("events").select("id, title").order("start_date", { ascending: false })

  if (error) {
    console.error("Error fetching events:", error)
    return []
  }

  return data
}

async function getLinkedEventIds() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("forms").select("event_id").not("event_id", "is", null)

  if (error) {
    console.error("Error fetching linked form events:", error)
    return []
  }

  return (data || []).map((row) => row.event_id).filter(Boolean) as string[]
}

export default async function FormCreatePage() {
  const [events, linkedEventIds] = await Promise.all([getEvents(), getLinkedEventIds()])

  return <FormEditor form={null} events={events} linkedEventIds={linkedEventIds} />
}

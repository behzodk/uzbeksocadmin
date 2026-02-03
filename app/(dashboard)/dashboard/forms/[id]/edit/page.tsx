import { notFound } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { FormEditor } from "./form-editor"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getForm(id: string) {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("forms").select("*").eq("id", id).single()

  if (error) {
    return null
  }

  return data
}

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

export default async function FormEditPage({ params }: PageProps) {
  const { id } = await params
  const [form, events, linkedEventIds] = await Promise.all([getForm(id), getEvents(), getLinkedEventIds()])

  if (!form) {
    notFound()
  }

  return <FormEditor form={form} events={events} linkedEventIds={linkedEventIds} />
}

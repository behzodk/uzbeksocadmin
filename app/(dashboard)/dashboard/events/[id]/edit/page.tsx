import { getSupabaseServerClient } from "@/lib/supabase/server"
import { EventEditor } from "./event-editor"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditEventPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  if (id === "new") {
    return <EventEditor event={null} />
  }

  const { data: event, error } = await supabase.from("events").select("*").eq("id", id).single()

  if (error || !event) {
    notFound()
  }

  return <EventEditor event={event} />
}

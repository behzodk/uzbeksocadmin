import { getSupabaseServerClient } from "@/lib/supabase/server"
import { CompetitionEditor } from "./competition-editor"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCompetetionPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: forms } = await supabase.from("forms").select("*").order("title", { ascending: true })

  if (id === "new") {
    return <CompetitionEditor competition={null} forms={forms || []} />
  }

  const { data: competition, error } = await supabase.from("competitions").select("*").eq("id", id).single()

  if (error || !competition) {
    notFound()
  }

  return <CompetitionEditor competition={competition} forms={forms || []} />
}

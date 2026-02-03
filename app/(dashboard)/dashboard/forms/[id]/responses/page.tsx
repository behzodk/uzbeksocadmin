import { notFound } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { FormResponsesClient } from "./responses-client"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getForm(id: string) {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("forms").select("id, title, schema").eq("id", id).single()

  if (error) {
    return null
  }

  return data
}

async function getResponses(id: string) {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("form_submissions")
    .select("id, form_id, status, answers, created_at")
    .eq("form_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching responses:", error)
    return []
  }

  return data
}

export default async function FormResponsesPage({ params }: PageProps) {
  const { id } = await params
  const [form, responses] = await Promise.all([getForm(id), getResponses(id)])

  if (!form) {
    notFound()
  }

  return <FormResponsesClient form={form} responses={responses} />
}

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { FormsClient } from "./forms-client"

async function getForms() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("forms").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching forms:", error)
    return []
  }

  return data
}

export default async function FormsPage() {
  const forms = await getForms()

  return <FormsClient initialForms={forms} />
}

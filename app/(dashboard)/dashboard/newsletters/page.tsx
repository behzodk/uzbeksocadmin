import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NewslettersClient } from "./newsletters-client"

async function getNewsletters() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("newsletters").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching newsletters:", error)
    return []
  }

  return data
}

export default async function NewslettersPage() {
  const newsletters = await getNewsletters()

  return <NewslettersClient initialNewsletters={newsletters} />
}

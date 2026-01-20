import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NewsClient } from "./news-client"

async function getNews() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("news").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching news:", error)
    return []
  }

  return data
}

export default async function NewsPage() {
  const news = await getNews()

  return <NewsClient initialNews={news} />
}

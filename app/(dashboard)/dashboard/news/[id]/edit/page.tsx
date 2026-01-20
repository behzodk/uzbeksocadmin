import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NewsEditor } from "./news-editor"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditNewsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  if (id === "new") {
    return <NewsEditor news={null} />
  }

  const { data: news, error } = await supabase.from("news").select("*").eq("id", id).single()

  if (error || !news) {
    notFound()
  }

  return <NewsEditor news={news} />
}

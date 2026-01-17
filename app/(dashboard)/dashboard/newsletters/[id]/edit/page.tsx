import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NewsletterEditor } from "./newsletter-editor"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditNewsletterPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  if (id === "new") {
    return <NewsletterEditor newsletter={null} />
  }

  const { data: newsletter, error } = await supabase.from("newsletters").select("*").eq("id", id).single()

  if (error || !newsletter) {
    notFound()
  }

  return <NewsletterEditor newsletter={newsletter} />
}

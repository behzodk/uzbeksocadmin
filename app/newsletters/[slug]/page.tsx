import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ContentPreview } from "@/components/editor/content-preview"
import { notFound } from "next/navigation"
import { Calendar, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await getSupabaseServerClient()

  const { data: newsletter } = await supabase.from("newsletters").select("subject, content").eq("slug", slug).single()

  return {
    title: newsletter?.subject || "Newsletter",
    description: newsletter?.content || "Newsletter content",
  }
}

export default async function NewsletterPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await getSupabaseServerClient()

  const { data: newsletter, error } = await supabase.from("newsletters").select("*").eq("slug", slug).single()

  if (error || !newsletter) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <Link href="/newsletters">
            <Button variant="secondary" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              All Newsletters
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-balance">{newsletter.subject}</h1>
          <div className="flex items-center justify-center gap-2 text-primary-foreground/80">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(newsletter.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {newsletter.content && (
          <p className="text-lg text-muted-foreground italic mb-8 pb-8 border-b">{newsletter.content}</p>
        )}

        {newsletter.content_html && <ContentPreview content={newsletter.content_html} />}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-muted-foreground mb-4">Want to receive newsletters like this in your inbox?</p>
          <Button>Subscribe to Newsletter</Button>
        </div>
      </div>
    </div>
  )
}

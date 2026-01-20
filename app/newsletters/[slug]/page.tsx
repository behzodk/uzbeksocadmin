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

  const { data: news } = await supabase.from("news").select("subject, content").eq("slug", slug).single()

  return {
    title: news?.subject || "News",
    description: news?.content || "News content",
  }
}

export default async function NewsPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await getSupabaseServerClient()

  const { data: news, error } = await supabase.from("news").select("*").eq("slug", slug).single()

  if (error || !news) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <Link href="/news">
            <Button variant="secondary" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              All News
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-balance">{news.subject}</h1>
          <div className="flex items-center justify-center gap-2 text-primary-foreground/80">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(news.created_at).toLocaleDateString("en-US", {
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
        {news.featured_image && (
          <div className="mb-8 overflow-hidden rounded-xl border bg-muted">
            <img
              src={news.featured_image}
              alt={news.subject}
              className="h-72 w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        {news.content && (
          <p className="text-lg text-muted-foreground italic mb-8 pb-8 border-b">{news.content}</p>
        )}

        {news.content_html && <ContentPreview content={news.content_html} />}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-muted-foreground mb-4">Want to receive news like this in your inbox?</p>
          <Button>Subscribe to News</Button>
        </div>
      </div>
    </div>
  )
}

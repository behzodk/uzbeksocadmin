import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ArrowRight, Mail } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "News",
  description: "Browse our past news",
}

export default async function NewsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: news } = await supabase
    .from("news")
    .select("*")
    .in("status", ["published", "scheduled"])
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">News</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay updated with our latest news and insights
          </p>
        </div>

        {news && news.length > 0 ? (
          <div className="space-y-4">
            {news.map((news) => (
              <Card key={news.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-center gap-6 p-6">
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-muted/40 overflow-hidden flex items-center justify-center">
                    {news.featured_image ? (
                      <img
                        src={news.featured_image}
                        alt={news.subject}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Mail className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold mb-1 truncate">{news.subject}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(news.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    {news.content && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{news.content}</p>
                    )}
                  </div>
                  <Link href={`/news/${news.slug}`}>
                    <Button variant="ghost" size="icon">
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No news published yet.</p>
          </div>
        )}

        <div className="mt-12 p-8 rounded-xl bg-muted/50 text-center">
          <h3 className="text-xl font-semibold mb-2">Never miss an update</h3>
          <p className="text-muted-foreground mb-4">Subscribe to receive our news directly in your inbox</p>
          <div className="flex max-w-md mx-auto gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-md border bg-background"
            />
            <Button>Subscribe</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

import Link from "next/link"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar, ListChecks, Trophy } from "lucide-react"

export const metadata = {
  title: "Competitions",
  description: "Browse published competitions and register your entry.",
}

export default async function CompetitionsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: competitions } = await supabase
    .from("competitions")
    .select("*")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("start_date", { ascending: true })

  const publishedCompetitions = (competitions || []).filter((competition) => competition.slug)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground">Competitions</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Explore live competitions, submit your entry, and collect guest ratings.
          </p>
        </div>

        {publishedCompetitions.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {publishedCompetitions.map((competition) => (
              <Card key={competition.id} className="overflow-hidden">
                {competition.featured_image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={competition.featured_image}
                      alt={competition.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <h2 className="text-xl font-semibold text-foreground">{competition.title}</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(competition.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="h-4 w-4" />
                    Entry type: {competition.entry_label || "Entry"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ListChecks className="h-4 w-4" />
                    {competition.rating_criteria?.length || 0} guest rating criteria
                  </div>
                  {competition.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{competition.description}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Link href={`/competitions/${competition.slug}`} className="w-full">
                    <Button variant="outline" className="w-full gap-2 bg-transparent">
                      View Competition
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground">No competitions are published right now.</div>
        )}
      </div>
    </div>
  )
}

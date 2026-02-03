import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, ArrowRight } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Events",
  description: "Browse our upcoming events",
}

export default async function EventsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("start_date", { ascending: true })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Upcoming Events</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Discover and join our upcoming events</p>
        </div>

        {events && events.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {(event.cover_image || event.featured_image) && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={event.cover_image || event.featured_image || "/placeholder.svg"}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <h3 className="text-xl font-semibold line-clamp-2">{event.title}</h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(event.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{event.description}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Link href={`/events/${event.slug}`} className="w-full">
                    <Button variant="outline" className="w-full gap-2 bg-transparent">
                      View Details
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No upcoming events at the moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}

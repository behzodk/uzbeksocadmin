import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ContentPreview } from "@/components/editor/content-preview"
import { notFound } from "next/navigation"
import { Calendar, MapPin, Users, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await getSupabaseServerClient()

  const { data: event } = await supabase
    .from("events")
    .select("title, description")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  return {
    title: event?.title || "Event",
    description: event?.description || "Event details",
  }
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await getSupabaseServerClient()

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (error || !event) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {(event.cover_image || event.featured_image) && (
        <div className="relative h-[40vh] min-h-[300px] overflow-hidden">
          <img
            src={event.cover_image || event.featured_image || "/placeholder.svg"}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/events">
          <Button variant="ghost" className="mb-6 -ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            All Events
          </Button>
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">{event.title}</h1>

        <div className="flex flex-wrap gap-6 text-muted-foreground mb-8 pb-8 border-b">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>
              {new Date(event.start_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>
              {new Date(event.start_date).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
              {event.end_date &&
                ` - ${new Date(event.end_date).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span>{event.location}</span>
            </div>
          )}
          {event.capacity && (
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>{event.capacity} spots available</span>
            </div>
          )}
        </div>

        {event.description && <p className="text-lg text-muted-foreground mb-8">{event.description}</p>}

        {event.content_html && <ContentPreview content={event.content_html} className="mb-12" />}

        <div className="mt-12 p-6 rounded-xl bg-muted/50 text-center">
          <h3 className="text-xl font-semibold mb-2">Interested in attending?</h3>
          <p className="text-muted-foreground mb-4">Register now to secure your spot!</p>
          <Button size="lg">Register for Event</Button>
        </div>
      </div>
    </div>
  )
}

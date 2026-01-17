"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Event } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { ContentPreview } from "@/components/editor/content-preview"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Eye, Edit3, Globe, Calendar, MapPin, Users, ImageIcon, Loader2 } from "lucide-react"

interface EventEditorProps {
  event: Event | null
}

export function EventEditor({ event }: EventEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("edit")

  const [formData, setFormData] = useState({
    title: event?.title || "",
    slug: event?.slug || "",
    description: event?.description || "",
    content_html: event?.content_html || "",
    location: event?.location || "",
    start_date: event?.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : "",
    end_date: event?.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : "",
    capacity: event?.capacity?.toString() || "",
    status: event?.status || "draft",
    featured_image: event?.featured_image || "",
    image_url: event?.image_url || "",
  })

  // Auto-generate slug from title
  useEffect(() => {
    if (!event && formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.title, event])

  const handleSubmit = async () => {
    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()

    const data = {
      title: formData.title,
      slug: formData.slug,
      description: formData.description,
      content_html: formData.content_html,
      location: formData.location || null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      capacity: formData.capacity ? Number.parseInt(formData.capacity) : null,
      status: formData.status as Event["status"],
      featured_image: formData.featured_image || null,
      image_url: formData.image_url || null,
    }

    if (event) {
      await supabase.from("events").update(data).eq("id", event.id)
    } else {
      await supabase.from("events").insert(data)
    }

    setIsLoading(false)
    router.push("/dashboard/events")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/events")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{event ? "Edit Event" : "Create New Event"}</h1>
              <p className="text-sm text-muted-foreground">
                {event ? `Editing: ${event.title}` : "Create a new event with rich content"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="edit" className="gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select
              value={formData.status}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {event ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-6">
        {activeTab === "edit" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    Event Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter event title"
                      className="text-lg"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="slug" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        URL Slug
                      </Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                        placeholder="event-url-slug"
                      />
                      <p className="text-xs text-muted-foreground">/events/{formData.slug || "your-slug"}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                        placeholder="Event location"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description for previews and SEO"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Event Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    value={formData.content_html}
                    onChange={(value) => setFormData((prev) => ({ ...prev, content_html: value }))}
                    placeholder="Write your event details here..."
                    minHeight="500px"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Date & Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date & Time</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date & Time</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Max Attendees</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Featured Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="featured_image">Image URL</Label>
                    <Input
                      id="featured_image"
                      value={formData.featured_image}
                      onChange={(e) => setFormData((prev) => ({ ...prev, featured_image: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  {formData.featured_image && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={formData.featured_image || "/placeholder.svg"}
                        alt="Featured"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8">
              {formData.featured_image && (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-8">
                  <img
                    src={formData.featured_image || "/placeholder.svg"}
                    alt={formData.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <h1 className="text-4xl font-bold text-foreground mb-4">{formData.title || "Untitled Event"}</h1>

              <div className="flex flex-wrap gap-4 text-muted-foreground mb-6">
                {formData.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(formData.start_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                )}
                {formData.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {formData.location}
                  </div>
                )}
                {formData.capacity && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {formData.capacity} spots
                  </div>
                )}
              </div>

              {formData.description && <p className="text-lg text-muted-foreground mb-8">{formData.description}</p>}

              <div className="border-t pt-8">
                <ContentPreview content={formData.content_html} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

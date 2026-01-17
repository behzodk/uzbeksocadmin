"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Event, ScheduleItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { ContentPreview } from "@/components/editor/content-preview"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Eye, Edit3, Globe, Calendar, MapPin, Users, ImageIcon, Loader2, Plus, X, Trash2, List, Star, Tag } from "lucide-react"

interface EventEditorProps {
  event: Event | null
}

export function EventEditor({ event }: EventEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("edit")

  const STANDARD_TYPES = ["conference", "workshop", "webinar", "meetup", "social", "other"]
  const initialIsCustom = event?.event_type ? !STANDARD_TYPES.includes(event.event_type) : false
  const [isCustomType, setIsCustomType] = useState(initialIsCustom)

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
    visibility: event?.visibility || "private",
    event_type: event?.event_type || "other",
    is_featured: event?.is_featured || false,
    featured_image: event?.featured_image || "",
    image_url: event?.image_url || "",
    highlights: event?.highlights || [],
    what_to_bring: event?.what_to_bring || [],
    schedule: event?.schedule || [],
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
      visibility: formData.visibility as Event["visibility"],
      event_type: formData.event_type,
      is_featured: formData.is_featured,
      featured_image: formData.featured_image || null,
      image_url: formData.image_url || null,
      highlights: formData.highlights,
      what_to_bring: formData.what_to_bring,
      schedule: formData.schedule,
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

  // Helper for array manipulation
  const addItem = (field: 'highlights' | 'what_to_bring', value: string) => {
    if (!value.trim()) return
    setFormData(prev => ({ ...prev, [field]: [...(prev[field] || []), value] }))
  }

  const removeItem = (field: 'highlights' | 'what_to_bring', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index)
    }))
  }

  const addScheduleItem = () => {
    setFormData(prev => ({
      ...prev,
      schedule: [...(prev.schedule || []), { time: "", title: "", description: "" }]
    }))
  }

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: (prev.schedule || []).map((item, i) => i === index ? { ...item, [field]: value } : item)
    }))
  }

  const removeScheduleItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedule: (prev.schedule || []).filter((_, i) => i !== index)
    }))
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
              onValueChange={(value) => {
                const status = value as Event["status"]
                const visibility = status === "published" ? "public" : "private"
                setFormData((prev) => ({ ...prev, status, visibility }))
              }}
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
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Event Logistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Highlights Section */}
                  <div className="space-y-3">
                    <Label className="text-base">Highlights</Label>
                    <div className="space-y-2">
                      {(formData.highlights || []).map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <Input value={item} readOnly className="flex-1 bg-muted/50" />
                          <Button variant="ghost" size="icon" onClick={() => removeItem('highlights', index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a highlight..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addItem('highlights', e.currentTarget.value)
                              e.currentTarget.value = ''
                            }
                          }}
                        />
                        <Button variant="secondary" onClick={(e) => {
                           // This is a bit hacky to get the input value without state, but works for simple adds
                           const input = e.currentTarget.previousElementSibling as HTMLInputElement
                           addItem('highlights', input.value)
                           input.value = ''
                        }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* What to Bring Section */}
                  <div className="space-y-3">
                    <Label className="text-base">What to Bring</Label>
                    <div className="space-y-2">
                      {(formData.what_to_bring || []).map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <Input value={item} readOnly className="flex-1 bg-muted/50" />
                          <Button variant="ghost" size="icon" onClick={() => removeItem('what_to_bring', index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add item..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addItem('what_to_bring', e.currentTarget.value)
                              e.currentTarget.value = ''
                            }
                          }}
                        />
                         <Button variant="secondary" onClick={(e) => {
                           const input = e.currentTarget.previousElementSibling as HTMLInputElement
                           addItem('what_to_bring', input.value)
                           input.value = ''
                        }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Schedule
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={addScheduleItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {(formData.schedule || []).map((item, index) => (
                    <div key={index} className="grid gap-4 sm:grid-cols-[100px_1fr_auto] items-start p-4 border rounded-lg bg-card">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Time</Label>
                        <Input 
                          value={item.time} 
                          onChange={(e) => updateScheduleItem(index, 'time', e.target.value)}
                          placeholder="09:00 AM" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Activity</Label>
                        <Input 
                          value={item.title} 
                          onChange={(e) => updateScheduleItem(index, 'title', e.target.value)}
                          placeholder="Opening Ceremony" 
                          className="font-medium"
                        />
                        <Textarea 
                          value={item.description || ''} 
                          onChange={(e) => updateScheduleItem(index, 'description', e.target.value)}
                          placeholder="Description (optional)" 
                          className="text-sm h-16 resize-none"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="mt-6" onClick={() => removeScheduleItem(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(formData.schedule || []).length === 0 && (
                     <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                        No schedule items yet. Click "Add Item" to start planning.
                     </div>
                  )}
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
                    <Tag className="h-5 w-5" />
                    Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="event_type">Event Type</Label>
                    <Select
                      value={isCustomType ? "custom" : formData.event_type}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setIsCustomType(true)
                          setFormData((prev) => ({ ...prev, event_type: "" }))
                        } else {
                          setIsCustomType(false)
                          setFormData((prev) => ({ ...prev, event_type: value }))
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="webinar">Webinar</SelectItem>
                        <SelectItem value="meetup">Meetup</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>

                    {isCustomType && (
                      <Input
                        placeholder="Type custom event type..."
                        value={formData.event_type}
                        onChange={(e) => setFormData((prev) => ({ ...prev, event_type: e.target.value }))}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_featured" className="text-base font-medium flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        Featured
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Pin to top of lists
                      </p>
                    </div>
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>

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
                <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium capitalize">
                  {formData.event_type}
                </div>
                {formData.is_featured && (
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 text-sm font-medium">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    Featured
                  </div>
                )}
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

              {/* Highlights & What to Bring Preview */}
              {(formData.highlights?.length > 0 || formData.what_to_bring?.length > 0) && (
                <div className="grid md:grid-cols-2 gap-8 mb-8 p-6 bg-muted/30 rounded-lg">
                  {formData.highlights?.length > 0 && (
                     <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                           <List className="w-4 h-4" /> Highlights
                        </h3>
                        <ul className="space-y-2 list-disc pl-5 text-sm">
                           {formData.highlights.map((h, i) => (
                              <li key={i}>{h}</li>
                           ))}
                        </ul>
                     </div>
                  )}
                  {formData.what_to_bring?.length > 0 && (
                     <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                           <Users className="w-4 h-4" /> What to Bring
                        </h3>
                         <ul className="space-y-2 list-disc pl-5 text-sm">
                           {formData.what_to_bring.map((h, i) => (
                              <li key={i}>{h}</li>
                           ))}
                        </ul>
                     </div>
                  )}
                </div>
              )}

              {/* Schedule Preview */}
               {formData.schedule?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Schedule</h3>
                  <div className="space-y-4 border-l-2 border-muted pl-4">
                    {formData.schedule.map((item, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary" />
                        <div className="mb-1 text-sm font-semibold text-primary">{item.time}</div>
                        <div className="font-medium">{item.title}</div>
                        {item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
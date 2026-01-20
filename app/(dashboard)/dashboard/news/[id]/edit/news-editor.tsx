"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { News } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { ContentPreview } from "@/components/editor/content-preview"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Eye, Edit3, Globe, Mail, Calendar, Users, Send, Loader2 } from "lucide-react"

interface NewsEditorProps {
  news: News | null
}

export function NewsEditor({ news }: NewsEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("edit")

  const [formData, setFormData] = useState({
    subject: news?.subject || "",
    slug: news?.slug || "",
    content: news?.content || "",
    content_html: news?.content_html || "",
    featured_image: news?.featured_image || "",
    status: news?.status || "draft",
    scheduled_at: news?.scheduled_at ? new Date(news.scheduled_at).toISOString().slice(0, 16) : "",
    recipient_count: news?.recipient_count?.toString() || "0",
  })

  // Auto-generate slug from subject
  useEffect(() => {
    if (!news && formData.subject) {
      const slug = formData.subject
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.subject, news])

  const handleSubmit = async () => {
    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()

    const data = {
      subject: formData.subject,
      slug: formData.slug,
      content: formData.content,
      content_html: formData.content_html,
      featured_image: formData.featured_image || null,
      status: formData.status as News["status"],
      scheduled_at: formData.scheduled_at || null,
      recipient_count: Number.parseInt(formData.recipient_count) || 0,
    }

    if (news) {
      await supabase.from("news").update(data).eq("id", news.id)
    } else {
      await supabase.from("news").insert(data)
    }

    setIsLoading(false)
    router.push("/dashboard/news")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/news")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {news ? "Edit News" : "Create News"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {news ? `Editing: ${news.subject}` : "Create a new news update with rich content"}
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
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {news ? "Update" : "Create"}
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
                    <Mail className="h-5 w-5" />
                    News Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">News Title</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="Enter news title"
                      className="text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      URL Slug (Web Version)
                    </Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="news-url-slug"
                    />
                    <p className="text-xs text-muted-foreground">/news/{formData.slug || "your-slug"}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Preview Text</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="Brief preview text shown in email clients"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="featured_image">Featured Image URL</Label>
                    <Input
                      id="featured_image"
                      value={formData.featured_image}
                      onChange={(e) => setFormData((prev) => ({ ...prev, featured_image: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. Used on the public news page and preview.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>News Content</CardTitle>
                  <CardDescription>Use the rich text editor to create your news content</CardDescription>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    value={formData.content_html}
                    onChange={(value) => setFormData((prev) => ({ ...prev, content_html: value }))}
                    placeholder="Compose your news here..."
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
                    <Send className="h-5 w-5" />
                    Delivery Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium capitalize">{formData.status}</span>
                    </div>
                    {news?.sent_at && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Sent</span>
                        <span className="font-medium">{new Date(news.sent_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {news?.open_rate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Open Rate</span>
                        <span className="font-medium">{news.open_rate}%</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at">Send Date & Time</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to send immediately when published</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recipients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="recipient_count">Recipient Count</Label>
                    <Input
                      id="recipient_count"
                      type="number"
                      value={formData.recipient_count}
                      onChange={(e) => setFormData((prev) => ({ ...prev, recipient_count: e.target.value }))}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Number of subscribers to receive this news</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Preview Mode - Email Style */
          <div className="max-w-2xl mx-auto">
            <Card className="overflow-hidden">
              {/* Email Header */}
              <div className="bg-primary px-6 py-8 text-center">
                <h1 className="text-2xl font-bold text-primary-foreground">
                  {formData.subject || "News Subject"}
                </h1>
              </div>

              {/* Email Body */}
              <CardContent className="p-8">
                {formData.featured_image && (
                  <div className="mb-6 overflow-hidden rounded-lg border bg-muted">
                    <img
                      src={formData.featured_image}
                      alt={formData.subject || "News featured image"}
                      className="h-64 w-full object-cover"
                    />
                  </div>
                )}
                {formData.content && (
                  <p className="text-muted-foreground italic mb-6 pb-6 border-b">{formData.content}</p>
                )}

                <ContentPreview content={formData.content_html} />
              </CardContent>

              {/* Email Footer */}
              <div className="bg-muted/50 px-6 py-4 text-center text-sm text-muted-foreground">
                <p>You received this email because you subscribed to our news.</p>
                <p className="mt-1">
                  <a href="#" className="text-primary underline">
                    Unsubscribe
                  </a>{" "}
                  |{" "}
                  <a href="#" className="text-primary underline">
                    View in browser
                  </a>
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

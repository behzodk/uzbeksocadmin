"use client"

import type React from "react"

import type { News } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"

interface NewsFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  news: News | null
  onSubmit: (data: Partial<News>) => void
  isLoading: boolean
}

export function NewsFormDialog({
  open,
  onOpenChange,
  news,
  onSubmit,
  isLoading,
}: NewsFormDialogProps) {
  const [formData, setFormData] = useState({
    subject: "",
    content: "",
    featured_image: "",
    status: "draft" as News["status"],
    scheduled_at: "",
    recipient_count: "0",
  })

  useEffect(() => {
    if (news) {
      setFormData({
        subject: news.subject,
        content: news.content,
        featured_image: news.featured_image || "",
        status: news.status,
        scheduled_at: news.scheduled_at?.split("T")[0] || "",
        recipient_count: news.recipient_count.toString(),
      })
    } else {
      setFormData({
        subject: "",
        content: "",
        featured_image: "",
        status: "draft",
        scheduled_at: "",
        recipient_count: "0",
      })
    }
  }, [news, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      subject: formData.subject,
      content: formData.content,
      featured_image: formData.featured_image || null,
      status: formData.status,
      scheduled_at: formData.scheduled_at || null,
      recipient_count: Number.parseInt(formData.recipient_count) || 0,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{news ? "Edit News" : "Create News"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">News Title *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              rows={8}
              required
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
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: News["status"]) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Schedule Date</Label>
              <Input
                id="scheduled_at"
                type="date"
                value={formData.scheduled_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, scheduled_at: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient_count">Recipients</Label>
              <Input
                id="recipient_count"
                type="number"
                min="0"
                value={formData.recipient_count}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    recipient_count: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : news ? "Update News" : "Create News"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

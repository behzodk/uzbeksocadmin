"use client"

import { type FormEvent, useMemo, useState } from "react"
import type { Competition } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CompetitionRegistrationFormProps {
  competition: Competition
}

export function CompetitionRegistrationForm({ competition }: CompetitionRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ entryName: string; ratingId: string } | null>(null)
  const [formData, setFormData] = useState({
    competitor_name: "",
    competitor_email: "",
    competitor_phone: "",
    entry_name: "",
    entry_description: "",
    entry_image: "",
  })

  const registrationOpen = useMemo(() => {
    if (!competition.registration_deadline) return true
    return new Date(competition.registration_deadline).getTime() > Date.now()
  }, [competition.registration_deadline])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    const supabase = getSupabaseBrowserClient()

    const { data } = await supabase
      .from("competition_entries")
      .insert({
        competition_id: competition.id,
        competitor_name: formData.competitor_name,
        competitor_email: formData.competitor_email || null,
        competitor_phone: formData.competitor_phone || null,
        entry_name: formData.entry_name,
        entry_description: formData.entry_description || null,
        entry_image: formData.entry_image || null,
        status: "pending",
      })
      .select("entry_name, rating_public_id")
      .single()

    if (data) {
      setSuccess({ entryName: data.entry_name, ratingId: data.rating_public_id })
      setFormData({
        competitor_name: "",
        competitor_email: "",
        competitor_phone: "",
        entry_name: "",
        entry_description: "",
        entry_image: "",
      })
    }

    setIsSubmitting(false)
  }

  if (!registrationOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration Closed</CardTitle>
          <CardDescription>This competition is no longer accepting new entries.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Register Your {competition.entry_label}</CardTitle>
          <CardDescription>
            Submit your {competition.entry_label.toLowerCase()} for {competition.title}. A guest rating ID will be created automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entry_name">{competition.entry_label} Name</Label>
                <Input
                  id="entry_name"
                  value={formData.entry_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, entry_name: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitor_name">Your Name</Label>
                <Input
                  id="competitor_name"
                  value={formData.competitor_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, competitor_name: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="competitor_email">Email</Label>
                <Input
                  id="competitor_email"
                  type="email"
                  value={formData.competitor_email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, competitor_email: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitor_phone">Phone</Label>
                <Input
                  id="competitor_phone"
                  value={formData.competitor_phone}
                  onChange={(event) => setFormData((prev) => ({ ...prev, competitor_phone: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_image">Image URL</Label>
              <Input
                id="entry_image"
                value={formData.entry_image}
                onChange={(event) => setFormData((prev) => ({ ...prev, entry_image: event.target.value }))}
                placeholder="https://example.com/your-entry.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_description">Description</Label>
              <Textarea
                id="entry_description"
                value={formData.entry_description}
                onChange={(event) => setFormData((prev) => ({ ...prev, entry_description: event.target.value }))}
                rows={5}
                placeholder={`Tell guests and judges about your ${competition.entry_label.toLowerCase()}.`}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : `Register ${competition.entry_label}`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {success && (
        <Card>
          <CardHeader>
            <CardTitle>Entry Submitted</CardTitle>
            <CardDescription>
              {success.entryName} has been registered. Your rating ID is ready and the public rating page will become usable once the entry is approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-mono text-sm text-foreground break-all">{success.ratingId}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

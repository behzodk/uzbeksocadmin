"use client"

import { type FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import type { Competition, CompetitionEntry } from "@/lib/types"
import { calculateWeightedRatingScore, normalizeLeaderboardSettings } from "@/lib/competition-scoring"
import {
  normalizeCompetitionVoterValidationSettings,
  normalizeVoterIdentity,
} from "@/lib/competition-voter-validation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star } from "lucide-react"

interface CompetitionRatingFormProps {
  competition: Competition
  entry: CompetitionEntry
}

export function CompetitionRatingForm({ competition, entry }: CompetitionRatingFormProps) {
  const criteria = competition.rating_criteria || []
  const leaderboardSettings = normalizeLeaderboardSettings(competition.leaderboard_settings)
  const voterValidationSettings = normalizeCompetitionVoterValidationSettings(competition.voter_validation_settings)
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, number | null>>(
    Object.fromEntries(criteria.map((criterion) => [criterion.id, null])),
  )
  const normalizedGuestEmail = useMemo(() => normalizeVoterIdentity(guestEmail), [guestEmail])

  const hasAllScores = useMemo(
    () => criteria.every((criterion) => typeof scores[criterion.id] === "number"),
    [criteria, scores],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!hasAllScores || !normalizedGuestEmail) return

    setIsSubmitting(true)
    setSubmitError(null)
    const normalizedScores = Object.fromEntries(
      criteria.map((criterion) => [criterion.id, Number(scores[criterion.id])]),
    )
    const totalScore = calculateWeightedRatingScore(normalizedScores, competition.rating_criteria, leaderboardSettings)
    const supabase = getSupabaseBrowserClient()

    const { error } = await supabase.from("competition_entry_ratings").insert({
      entry_id: entry.id,
      competition_id: competition.id,
      guest_name: guestName || null,
      guest_email: normalizedGuestEmail,
      notes: notes || null,
      scores: normalizedScores,
      total_score: totalScore,
    })

    if (error) {
      setSubmitError(error.message || "Unable to submit your rating.")
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setSubmitted(true)
  }

  if (criteria.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rating Not Available</CardTitle>
          <CardDescription>This competition does not have guest rating criteria configured yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thanks for Rating</CardTitle>
          <CardDescription>Your feedback for {entry.entry_name} has been recorded.</CardDescription>
        </CardHeader>
        <CardContent>
          {competition.slug && (
            <Link href={`/competitions/${competition.slug}`}>
              <Button variant="outline">Back to Competition</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate {entry.entry_name}</CardTitle>
          <CardDescription>
            This {competition.entry_label.toLowerCase()} is part of {competition.title} by {entry.competitor_name}.
          </CardDescription>
        </CardHeader>
        {entry.entry_image && (
          <CardContent className="pt-0">
            <img
              src={entry.entry_image}
              alt={entry.entry_name}
              className="max-h-80 w-full rounded-xl object-cover"
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guest Rating</CardTitle>
          <CardDescription>
            Score each criterion using the configured rating range. Final result is normalized to{" "}
            {leaderboardSettings.result_max}. Each email can rate this {competition.entry_label.toLowerCase()} only
            once.
            {voterValidationSettings.eligibility_form_id && voterValidationSettings.eligibility_form_field_key
              ? " Your email must also match the linked registration form before your vote is accepted."
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guest_name">Your Name</Label>
                <Input id="guest_name" value={guestName} onChange={(event) => setGuestName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest_email">Email</Label>
                <Input
                  id="guest_email"
                  type="email"
                  value={guestEmail}
                  onChange={(event) => {
                    setGuestEmail(event.target.value)
                    setSubmitError(null)
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use the same email that was used on the registration form if voter validation is enabled.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {criteria.map((criterion) => {
                const values = Array.from(
                  { length: criterion.scale_max - criterion.scale_min + 1 },
                  (_, index) => criterion.scale_min + index,
                )

                return (
                  <div key={criterion.id} className="rounded-xl border border-border p-4">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{criterion.label}</p>
                      {criterion.description && (
                        <p className="text-sm text-muted-foreground">{criterion.description}</p>
                      )}
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {criterion.weight_percentage}% importance
                      </p>
                    </div>

                    {criterion.scale_type === "stars" ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {values.map((value) => {
                          const active = scores[criterion.id] === value
                          return (
                            <Button
                              key={value}
                              type="button"
                              variant={active ? "default" : "outline"}
                              onClick={() => setScores((prev) => ({ ...prev, [criterion.id]: value }))}
                              className="gap-2"
                            >
                              <Star className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
                              {value}
                            </Button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        <Label>Select score</Label>
                        <Select
                          value={
                            scores[criterion.id] !== null && scores[criterion.id] !== undefined
                              ? String(scores[criterion.id])
                              : undefined
                          }
                          onValueChange={(value) =>
                            setScores((prev) => ({ ...prev, [criterion.id]: Number.parseInt(value, 10) }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Choose between ${criterion.scale_min} and ${criterion.scale_max}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {values.map((value) => (
                              <SelectItem key={value} value={String(value)}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Optional comments about this entry"
              />
            </div>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <Button type="submit" disabled={!hasAllScores || !normalizedGuestEmail || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Rating"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

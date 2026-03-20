"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { StatsCard } from "@/components/dashboard/stats-card"
import { StatusBadge, getStatusVariant } from "@/components/dashboard/status-badge"
import { useRoles } from "@/components/dashboard/role-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  calculateWeightedRatingScore,
  normalizeLeaderboardSettings,
  normalizeRatingCriteria,
} from "@/lib/competition-scoring"
import type { Competition, CompetitionEntry, CompetitionEntryRating } from "@/lib/types"
import { ArrowLeft, CalendarClock, ExternalLink, MessageSquareText, Star, Users } from "lucide-react"

interface CompetitionEntryVotesClientProps {
  competition: Competition
  entry: CompetitionEntry
  ratings: CompetitionEntryRating[]
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function getGuestLabel(rating: CompetitionEntryRating, index: number) {
  const guestName = rating.guest_name?.trim()
  if (guestName) return guestName

  const guestEmail = rating.guest_email?.trim()
  if (guestEmail) return guestEmail

  return `Guest ${index + 1}`
}

export function CompetitionEntryVotesClient({
  competition,
  entry,
  ratings,
}: CompetitionEntryVotesClientProps) {
  const router = useRouter()
  const { roles, loading } = useRoles()

  const canRead = roles.super_admin || roles.competitions?.read

  useEffect(() => {
    if (!loading && !canRead) {
      router.push("/dashboard/competetion?error=unauthorized")
    }
  }, [canRead, loading, router])

  const criteria = useMemo(() => normalizeRatingCriteria(competition.rating_criteria), [competition.rating_criteria])
  const leaderboardSettings = useMemo(
    () => normalizeLeaderboardSettings(competition.leaderboard_settings),
    [competition.leaderboard_settings],
  )

  const voteDetails = useMemo(
    () =>
      ratings.map((rating, index) => {
        const criteriaBreakdown = criteria.map((criterion) => {
          const scaleMin = Number(criterion.scale_min) || 0
          const scaleMax = Math.max(1, Number(criterion.scale_max) || 1)
          const rawScore = Number(rating.scores?.[criterion.id] ?? scaleMin)
          const boundedScore = Math.min(scaleMax, Math.max(scaleMin, rawScore))
          const contribution =
            (boundedScore / scaleMax) * (criterion.weight_percentage / 100) * leaderboardSettings.result_max

          return {
            id: criterion.id,
            label: criterion.label,
            description: criterion.description,
            score: boundedScore,
            scaleMax,
            weightPercentage: criterion.weight_percentage,
            contribution,
          }
        })

        return {
          ...rating,
          guestLabel: getGuestLabel(rating, index),
          calculatedTotal: calculateWeightedRatingScore(
            rating.scores || {},
            competition.rating_criteria,
            leaderboardSettings,
          ),
          criteriaBreakdown,
        }
      }),
    [competition.rating_criteria, criteria, leaderboardSettings, ratings],
  )

  const totalVotes = voteDetails.length
  const averageScore =
    totalVotes > 0
      ? voteDetails.reduce((sum, rating) => sum + rating.calculatedTotal, 0) / totalVotes
      : 0
  const latestVote = voteDetails[0]?.created_at
  const notesCount = voteDetails.filter((rating) => rating.notes?.trim()).length
  const entryLabelLower = (competition.entry_label || "Entry").toLowerCase()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/dashboard/competetion/${competition.id}/entries`}>
            <Button variant="ghost" className="mb-3 -ml-2 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Entries
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{entry.entry_name} Votes</h1>
          <p className="mt-1 text-muted-foreground">
            Review each individual guest vote for this {entryLabelLower}.
          </p>
        </div>
        {entry.status === "approved" && (
          <Button variant="outline" size="sm" onClick={() => window.open(`/competitions/rate/${entry.rating_public_id}`, "_blank")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Rating Page
          </Button>
        )}
      </div>

      <Card>
        <CardContent
          className={
            entry.entry_image
              ? "grid gap-6 p-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]"
              : "p-6"
          }
        >
          {entry.entry_image ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <img src={entry.entry_image} alt={entry.entry_name} className="h-full w-full object-cover" />
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">{entry.entry_name}</h2>
              <StatusBadge status={entry.status} variant={getStatusVariant(entry.status)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Competitor</p>
                <p className="mt-2 text-sm font-medium text-foreground">{entry.competitor_name}</p>
              </div>
              <div className="rounded-xl bg-muted/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rating ID</p>
                <p className="mt-2 break-all font-mono text-xs text-foreground">{entry.rating_public_id}</p>
              </div>
              <div className="rounded-xl bg-muted/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Competition</p>
                <p className="mt-2 text-sm font-medium text-foreground">{competition.title}</p>
              </div>
              <div className="rounded-xl bg-muted/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Score Model</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {criteria.length} criteria • out of {leaderboardSettings.result_max}
                </p>
              </div>
            </div>

            {entry.entry_description ? (
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Description</p>
                <p className="mt-2 text-sm text-foreground">{entry.entry_description}</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Total Votes" value={totalVotes} icon={Users} />
        <StatsCard
          title="Average Score"
          value={totalVotes > 0 ? `${averageScore.toFixed(2)} / ${leaderboardSettings.result_max}` : "-"}
          icon={Star}
        />
        <StatsCard title="Latest Vote" value={latestVote ? formatDateTime(latestVote) : "-"} icon={CalendarClock} />
        <StatsCard title="With Notes" value={notesCount} icon={MessageSquareText} />
      </div>

      {voteDetails.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No votes have been submitted for this entry yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {voteDetails.map((rating, index) => (
            <Card key={rating.id}>
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Vote #{index + 1}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {rating.guestLabel}
                      {rating.guest_email && rating.guest_email !== rating.guestLabel ? ` • ${rating.guest_email}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Submitted {formatDateTime(rating.created_at)}
                      {rating.voter_identity && rating.voter_identity !== rating.guest_email
                        ? ` • voter identity: ${rating.voter_identity}`
                        : ""}
                    </p>
                  </div>
                  <div className="rounded-xl bg-primary/5 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Weighted Total</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {rating.calculatedTotal.toFixed(2)}
                      <span className="text-sm font-medium text-muted-foreground"> / {leaderboardSettings.result_max}</span>
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {criteria.length > 0 ? (
                  <Accordion type="single" collapsible className="rounded-xl border border-dashed border-border px-4">
                    <AccordionItem value="score-breakdown" className="border-b-0">
                      <AccordionTrigger className="py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:no-underline">
                        View Score Breakdown
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-1">
                        <div className="grid gap-3 md:grid-cols-2">
                          {rating.criteriaBreakdown.map((criterion) => (
                            <div key={criterion.id} className="rounded-xl bg-muted/45 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{criterion.label}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatScore(criterion.weightPercentage)}% weight
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-foreground">
                                    {formatScore(criterion.score)} / {formatScore(criterion.scaleMax)}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {criterion.contribution.toFixed(2)} points
                                  </p>
                                </div>
                              </div>
                              {criterion.description ? (
                                <p className="mt-3 text-sm text-muted-foreground">{criterion.description}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                          Final weighted total = sum of criterion contributions = {rating.calculatedTotal.toFixed(2)} /{" "}
                          {leaderboardSettings.result_max}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : (
                  <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                    No rating criteria are configured for this competition.
                  </div>
                )}

                {rating.notes ? (
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Guest Note</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{rating.notes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

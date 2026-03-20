import Link from "next/link"
import { notFound } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import {
  buildCompetitionLeaderboard,
  getMinimumRatingsRequiredForPlacement,
  normalizeLeaderboardSettings,
} from "@/lib/competition-scoring"
import { LeaderboardScoreBreakdown } from "@/components/competition/leaderboard-score-breakdown"
import { ContentPreview } from "@/components/editor/content-preview"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CompetitionRatingCriterion } from "@/lib/types"
import { ArrowLeft, Calendar, ListChecks, MapPin, Star, Trophy, Users } from "lucide-react"

interface PageProps {
  params: Promise<{ slug: string }>
}

function pluralize(label: string) {
  if (/(s|x|z|ch|sh)$/i.test(label)) return `${label}es`
  if (/[^aeiou]y$/i.test(label)) return `${label.slice(0, -1)}ies`
  return `${label}s`
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await getSupabaseServerClient()

  const { data: competition } = await supabase
    .from("competitions")
    .select("title, description")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("visibility", "public")
    .single()

  return {
    title: competition?.title || "Competition",
    description: competition?.description || "Competition details",
  }
}

export default async function CompetitionPublicPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await getSupabaseServerClient()

  const { data: competition, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("visibility", "public")
    .single()

  if (error || !competition) {
    notFound()
  }

  const [{ data: entries }, { data: ratings }] = await Promise.all([
    supabase
      .from("competition_entries")
      .select("*")
      .eq("competition_id", competition.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true }),
    supabase.from("competition_entry_ratings").select("*").eq("competition_id", competition.id),
  ])

  const registrationOpen =
    !competition.registration_deadline || new Date(competition.registration_deadline).getTime() > Date.now()
  const entryLabelPlural = pluralize(competition.entry_label || "Entry")
  const leaderboardSettings = normalizeLeaderboardSettings(competition.leaderboard_settings)
  const minimumRatingsToPlace = getMinimumRatingsRequiredForPlacement(competition.leaderboard_settings)
  const leaderboardRows = buildCompetitionLeaderboard(competition, entries || [], ratings || [])
  const rankedLeaderboardRows = leaderboardRows.filter((row) => row.isEligibleForPlacement)
  const pendingLeaderboardRows = leaderboardRows.filter((row) => !row.isEligibleForPlacement)
  const leaderboardByEntry = new Map(leaderboardRows.map((row) => [row.entry.id, row]))

  return (
    <div className="min-h-screen bg-background">
      {competition.featured_image && (
        <div className="relative h-[38vh] min-h-[280px] overflow-hidden">
          <img src={competition.featured_image} alt={competition.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link href="/competitions">
          <Button variant="ghost" className="mb-6 -ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            All Competitions
          </Button>
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-foreground md:text-5xl">{competition.title}</h1>
            {competition.description && <p className="mt-4 text-lg text-muted-foreground">{competition.description}</p>}
          </div>

          {registrationOpen && competition.slug && (
            <Link href={`/competitions/${competition.slug}/register`}>
              <Button size="lg">Register Your {competition.entry_label}</Button>
            </Link>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Start</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {new Date(competition.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Entry Type</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{competition.entry_label}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <ListChecks className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Criteria</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{competition.rating_criteria?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Capacity</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{competition.capacity || "Unlimited"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <div className="space-y-8">
            {competition.content_html && (
              <Card>
                <CardContent className="p-8">
                  <ContentPreview content={competition.content_html} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Approved {entryLabelPlural}</CardTitle>
              </CardHeader>
              <CardContent>
                {entries && entries.length > 0 ? (
                  <div className="grid gap-4">
                    {entries.map((entry) => {
                      const leaderboardRow = leaderboardByEntry.get(entry.id)

                      return (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              {entry.entry_image && (
                                <img
                                  src={entry.entry_image}
                                  alt={entry.entry_name}
                                  className="mb-4 h-44 w-full rounded-xl object-cover"
                                />
                              )}
                              <h3 className="text-lg font-semibold text-foreground">{entry.entry_name}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">By {entry.competitor_name}</p>
                              {entry.entry_description && (
                                <p className="mt-3 text-sm text-muted-foreground">{entry.entry_description}</p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                <span>{leaderboardRow?.ratingsCount || 0} guest ratings</span>
                                {leaderboardRow && leaderboardRow.ratingsCount > 0 && (
                                  <span>
                                    {leaderboardRow.displayScore.toFixed(2)} / {leaderboardSettings.result_max}
                                  </span>
                                )}
                                {leaderboardRow && !leaderboardRow.isEligibleForPlacement && (
                                  <span>
                                    Needs {leaderboardRow.ratingsNeededForPlacement} more{" "}
                                    {leaderboardRow.ratingsNeededForPlacement === 1 ? "rating" : "ratings"} to place
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-col gap-2">
                              <Link href={`/competitions/rate/${entry.rating_public_id}`}>
                                <Button className="gap-2">
                                  <Star className="h-4 w-4" />
                                  Rate This {competition.entry_label}
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No approved entries are listed yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {rankedLeaderboardRows.length > 0 ? (
                  <>
                    <div className="rounded-xl border border-border px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        Ranked by{" "}
                        {leaderboardSettings.scoring_method === "behzod_formula"
                          ? "Behzod's Formula"
                          : "Average Score"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Final scores are normalized to {leaderboardSettings.result_max}.
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Minimum {minimumRatingsToPlace} {minimumRatingsToPlace === 1 ? "rating" : "ratings"} required
                        to place on the leaderboard.
                      </p>
                      {pendingLeaderboardRows.length > 0 && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {pendingLeaderboardRows.length} {pendingLeaderboardRows.length === 1 ? "entry is" : "entries are"} still waiting to reach the placement minimum.
                        </p>
                      )}
                    </div>

                    {rankedLeaderboardRows.map((row, index) => (
                      <div key={row.entry.id} className="rounded-xl border border-border px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">
                              #{index + 1} {row.entry.entry_name}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">By {row.entry.competitor_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {row.displayScore.toFixed(2)} / {leaderboardSettings.result_max}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{row.ratingsCount} ratings</p>
                          </div>
                        </div>
                        {leaderboardSettings.scoring_method === "behzod_formula" && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Raw average: {row.averageScore.toFixed(2)} / {leaderboardSettings.result_max}
                          </p>
                        )}

                        <LeaderboardScoreBreakdown row={row} leaderboardSettings={leaderboardSettings} />
                      </div>
                    ))}

                    {competition.slug && (
                      <Link href={`/competitions/${competition.slug}/leaderboard`}>
                        <Button variant="outline" className="w-full bg-transparent">
                          View Full Leaderboard
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {pendingLeaderboardRows.length > 0
                        ? `No entry has reached the minimum of ${minimumRatingsToPlace} ${minimumRatingsToPlace === 1 ? "rating" : "ratings"} required to place yet.`
                        : "Leaderboard will appear once approved entries receive ratings."}
                    </p>
                    {competition.slug && (
                      <Link href={`/competitions/${competition.slug}/leaderboard`}>
                        <Button variant="outline" className="w-full bg-transparent">
                          View Full Leaderboard
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating Criteria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {competition.rating_criteria?.length ? (
                  competition.rating_criteria.map((criterion: CompetitionRatingCriterion) => (
                    <div key={criterion.id} className="rounded-xl border border-border px-4 py-3">
                      <p className="font-medium text-foreground">{criterion.label}</p>
                      {criterion.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{criterion.description}</p>
                      )}
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {criterion.weight_percentage}% weight • {criterion.scale_type} {criterion.scale_min} to {criterion.scale_max}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Guest rating has not been configured yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {competition.location && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{competition.location}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                  <span>
                    Deadline:{" "}
                    {competition.registration_deadline
                      ? new Date(competition.registration_deadline).toLocaleString("en-US")
                      : "No registration deadline"}
                  </span>
                </div>

                {registrationOpen && competition.slug ? (
                  <Link href={`/competitions/${competition.slug}/register`}>
                    <Button className="mt-2 w-full">Register Your {competition.entry_label}</Button>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Registration is closed for this competition.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

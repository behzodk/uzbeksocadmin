import Link from "next/link"
import { notFound } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import {
  buildCompetitionLeaderboard,
  getMinimumRatingsRequiredForPlacement,
  normalizeLeaderboardSettings,
} from "@/lib/competition-scoring"
import { LeaderboardScoreBreakdown } from "@/components/competition/leaderboard-score-breakdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Star, Trophy, Users } from "lucide-react"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await getSupabaseServerClient()

  const { data: competition } = await supabase
    .from("competitions")
    .select("title")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("visibility", "public")
    .single()

  return {
    title: competition ? `${competition.title} Leaderboard` : "Competition Leaderboard",
  }
}

export default async function CompetitionLeaderboardPage({ params }: PageProps) {
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

  const leaderboardSettings = normalizeLeaderboardSettings(competition.leaderboard_settings)
  const minimumRatingsToPlace = getMinimumRatingsRequiredForPlacement(competition.leaderboard_settings)
  const leaderboardRows = buildCompetitionLeaderboard(competition, entries || [], ratings || [])
  const rankedRows = leaderboardRows.filter((row) => row.isEligibleForPlacement)
  const pendingRows = leaderboardRows.filter((row) => !row.isEligibleForPlacement)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link href={`/competitions/${competition.slug}`}>
          <Button variant="ghost" className="mb-6 -ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Competition
          </Button>
        </Link>

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">{competition.title} Leaderboard</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Ranked by{" "}
              {leaderboardSettings.scoring_method === "behzod_formula" ? "Behzod's Formula" : "Average Score"} with
              final scores normalized to {leaderboardSettings.result_max}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Entries need at least {minimumRatingsToPlace} {minimumRatingsToPlace === 1 ? "rating" : "ratings"} to
              receive a place. Entries below that minimum are shown separately.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Entries</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{entries?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ratings</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{ratings?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Threshold</p>
                    <p className="mt-1 text-base font-semibold text-foreground">
                      {minimumRatingsToPlace}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Standings</CardTitle>
          </CardHeader>
          <CardContent>
            {rankedRows.length > 0 ? (
              <div className="space-y-4">
                {rankedRows.map((row, index) => (
                  <div
                    key={row.entry.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="text-lg font-semibold text-foreground">{row.entry.entry_name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">By {row.entry.competitor_name}</p>
                          {row.entry.entry_description && (
                            <p className="mt-2 text-sm text-muted-foreground">{row.entry.entry_description}</p>
                          )}
                          {leaderboardSettings.scoring_method === "behzod_formula" && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Raw average: {row.averageScore.toFixed(2)} / {leaderboardSettings.result_max}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-4 md:text-right">
                        {row.entry.entry_image && (
                          <img
                            src={row.entry.entry_image}
                            alt={row.entry.entry_name}
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                        )}
                        <div>
                          <p className="text-xl font-bold text-foreground">
                            {row.displayScore.toFixed(2)} / {leaderboardSettings.result_max}
                          </p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {row.ratingsCount} ratings
                          </p>
                        </div>
                      </div>
                    </div>

                    <LeaderboardScoreBreakdown row={row} leaderboardSettings={leaderboardSettings} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {pendingRows.length > 0
                  ? `No entry has reached the minimum of ${minimumRatingsToPlace} ${minimumRatingsToPlace === 1 ? "rating" : "ratings"} required to place yet.`
                  : "No leaderboard data yet. Approved entries need ratings before standings can be calculated."}
              </p>
            )}
          </CardContent>
        </Card>

        {pendingRows.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Awaiting Placement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingRows.map((row) => (
                  <div
                    key={row.entry.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Pending
                        </div>

                        <div className="min-w-0">
                          <p className="text-lg font-semibold text-foreground">{row.entry.entry_name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">By {row.entry.competitor_name}</p>
                          {row.entry.entry_description && (
                            <p className="mt-2 text-sm text-muted-foreground">{row.entry.entry_description}</p>
                          )}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {row.ratingsCount} / {minimumRatingsToPlace} ratings received. Needs{" "}
                            {row.ratingsNeededForPlacement} more{" "}
                            {row.ratingsNeededForPlacement === 1 ? "rating" : "ratings"} to place.
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-4 md:text-right">
                        {row.entry.entry_image && (
                          <img
                            src={row.entry.entry_image}
                            alt={row.entry.entry_name}
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                        )}
                        <div>
                          {row.ratingsCount > 0 ? (
                            <>
                              <p className="text-xl font-bold text-foreground">
                                {row.displayScore.toFixed(2)} / {leaderboardSettings.result_max}
                              </p>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Current score
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-xl font-bold text-foreground">No ratings yet</p>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Unranked
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <LeaderboardScoreBreakdown row={row} leaderboardSettings={leaderboardSettings} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

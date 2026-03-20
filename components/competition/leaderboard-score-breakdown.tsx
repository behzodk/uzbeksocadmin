import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { CompetitionLeaderboardRow } from "@/lib/competition-scoring"
import type { CompetitionLeaderboardSettings } from "@/lib/types"

interface LeaderboardScoreBreakdownProps {
  row: CompetitionLeaderboardRow
  leaderboardSettings: CompetitionLeaderboardSettings
}

function formatScore(value: number) {
  return value.toFixed(2)
}

function getGuestLabel(guestName: string | null, index: number) {
  const trimmed = guestName?.trim()
  return trimmed || `Guest ${index + 1}`
}

export function LeaderboardScoreBreakdown({
  row,
  leaderboardSettings,
}: LeaderboardScoreBreakdownProps) {
  const totalOfRatings = row.ratingDetails.reduce((sum, detail) => sum + detail.totalScore, 0)
  const v = row.ratingsCount
  const m = leaderboardSettings.minimum_ratings_threshold
  const r = row.averageScore
  const c = row.overallAverageScore
  const denominator = v + m
  const entryShare = denominator > 0 ? v / denominator : 0
  const communityShare = denominator > 0 ? m / denominator : 0
  const usesBehzodFormula = leaderboardSettings.scoring_method === "behzod_formula"

  return (
    <Accordion type="single" collapsible className="mt-4 rounded-xl border border-dashed border-border px-4">
      <AccordionItem value="formula" className="border-b-0">
        <AccordionTrigger className="py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:no-underline">
          Extend Formula
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-1">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Formula Used</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {usesBehzodFormula ? "Behzod's Formula" : "Average Score"}
              </p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {usesBehzodFormula
                  ? "Adjusted Score = (v / (v + m)) x R + (m / (v + m)) x C"
                  : "Final Score = R"}
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Variables</p>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">R</span>: this entry&apos;s average weighted score ={" "}
                  {formatScore(r)} / {leaderboardSettings.result_max}
                </p>
                <p>
                  <span className="font-medium text-foreground">v</span>: ratings for this entry = {v}
                </p>
                {usesBehzodFormula && (
                  <>
                    <p>
                      <span className="font-medium text-foreground">C</span>: overall average across rated entries ={" "}
                      {formatScore(c)} / {leaderboardSettings.result_max}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">m</span>: minimum ratings threshold = {m}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {row.ratingDetails.length > 0 ? (
            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium text-foreground">Weighted Guest Totals</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Each total already includes criterion weights and normalization to {leaderboardSettings.result_max}.
              </p>
              <div className="mt-3 space-y-2">
                {row.ratingDetails.map((detail, index) => (
                  <div key={detail.ratingId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{getGuestLabel(detail.guestName, index)}</span>
                    <span className="font-medium text-foreground">
                      {formatScore(detail.totalScore)} / {leaderboardSettings.result_max}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              No guest ratings yet, so this entry does not have a full score derivation yet.
            </div>
          )}

          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium text-foreground">Derivation</p>
            {row.ratingDetails.length > 0 ? (
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>
                  Sum of weighted guest totals = {formatScore(totalOfRatings)} / {leaderboardSettings.result_max}
                </p>
                <p>
                  R = {formatScore(totalOfRatings)} / {v} = {formatScore(r)} / {leaderboardSettings.result_max}
                </p>
                {usesBehzodFormula ? (
                  <>
                    <p>
                      v / (v + m) = {v} / ({v} + {m}) = {formatScore(entryShare)}
                    </p>
                    <p>
                      m / (v + m) = {m} / ({v} + {m}) = {formatScore(communityShare)}
                    </p>
                    <p>
                      Adjusted Score = ({formatScore(entryShare)} x {formatScore(r)}) + ({formatScore(communityShare)} x{" "}
                      {formatScore(c)})
                    </p>
                    <p>
                      Adjusted Score = {formatScore(entryShare * r)} + {formatScore(communityShare * c)} ={" "}
                      {formatScore(row.displayScore)} / {leaderboardSettings.result_max}
                    </p>
                  </>
                ) : (
                  <p>
                    Final Score = R = {formatScore(row.displayScore)} / {leaderboardSettings.result_max}
                  </p>
                )}
                {!row.isEligibleForPlacement && (
                  <p>
                    This entry is not placed yet because it still needs {row.ratingsNeededForPlacement} more{" "}
                    {row.ratingsNeededForPlacement === 1 ? "rating" : "ratings"} to reach the minimum of {m}.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                This entry needs guest ratings before R and the final displayed score can be derived.
              </p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

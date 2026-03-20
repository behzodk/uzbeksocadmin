import type {
  Competition,
  CompetitionEntry,
  CompetitionEntryRating,
  CompetitionLeaderboardSettings,
  CompetitionRatingCriterion,
} from "@/lib/types"

const DEFAULT_RESULT_MAX = 100
const DEFAULT_MINIMUM_RATINGS_THRESHOLD = 5

export type NormalizedCompetitionRatingCriterion = CompetitionRatingCriterion & {
  description: string
}

function roundTo(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function distributePercentages(count: number) {
  if (count <= 0) return []

  const base = Math.floor((10000 / count)) / 100
  const percentages = Array.from({ length: count }, () => base)
  const total = percentages.reduce((sum, percentage) => sum + percentage, 0)
  percentages[count - 1] = roundTo(percentages[count - 1] + (100 - total))

  return percentages
}

export function normalizeRatingCriteria(criteria?: CompetitionRatingCriterion[] | null): NormalizedCompetitionRatingCriterion[] {
  const source = criteria || []
  const defaultWeights = distributePercentages(source.length)

  return source.map((criterion, index) => ({
    ...criterion,
    description: criterion.description || "",
    scale_type: criterion.scale_type || "stars",
    scale_min: Number.isFinite(Number(criterion.scale_min)) ? Number(criterion.scale_min) : 1,
    scale_max: Number.isFinite(Number(criterion.scale_max)) ? Number(criterion.scale_max) : 5,
    weight_percentage:
      Number.isFinite(Number(criterion.weight_percentage)) && Number(criterion.weight_percentage) >= 0
        ? Number(criterion.weight_percentage)
        : defaultWeights[index] || 0,
  }))
}

export function rebalanceCriterionWeights(criteria: CompetitionRatingCriterion[]): NormalizedCompetitionRatingCriterion[] {
  const normalizedCriteria = normalizeRatingCriteria(criteria)
  const percentages = distributePercentages(normalizedCriteria.length)

  return normalizedCriteria.map((criterion, index) => ({
    ...criterion,
    weight_percentage: percentages[index] || 0,
  }))
}

export function getCriterionWeightTotal(criteria?: CompetitionRatingCriterion[] | null) {
  return roundTo(
    normalizeRatingCriteria(criteria).reduce((sum, criterion) => sum + Number(criterion.weight_percentage || 0), 0),
  )
}

export function normalizeLeaderboardSettings(
  settings?: CompetitionLeaderboardSettings | null,
): CompetitionLeaderboardSettings {
  return {
    result_max:
      Number.isFinite(Number(settings?.result_max)) && Number(settings?.result_max) > 0
        ? Number(settings?.result_max)
        : DEFAULT_RESULT_MAX,
    scoring_method: settings?.scoring_method === "behzod_formula" ? "behzod_formula" : "average",
    minimum_ratings_threshold:
      Number.isFinite(Number(settings?.minimum_ratings_threshold))
        ? Math.max(1, Math.ceil(Number(settings?.minimum_ratings_threshold)))
        : DEFAULT_MINIMUM_RATINGS_THRESHOLD,
  }
}

export function getMinimumRatingsRequiredForPlacement(settings?: CompetitionLeaderboardSettings | null) {
  return normalizeLeaderboardSettings(settings).minimum_ratings_threshold
}

export function calculateWeightedRatingScore(
  scores: Record<string, number>,
  criteria: CompetitionRatingCriterion[] | null | undefined,
  leaderboardSettings?: CompetitionLeaderboardSettings | null,
) {
  const normalizedCriteria = normalizeRatingCriteria(criteria)
  const settings = normalizeLeaderboardSettings(leaderboardSettings)

  if (normalizedCriteria.length === 0) return 0

  const total = normalizedCriteria.reduce((sum, criterion) => {
    const rawScore = Number(scores?.[criterion.id] ?? 0)
    const scaleMax = Math.max(1, Number(criterion.scale_max) || 1)
    const boundedScore = Math.min(scaleMax, Math.max(Number(criterion.scale_min) || 0, rawScore))
    const criterionShare = boundedScore / scaleMax

    return sum + criterionShare * (criterion.weight_percentage / 100) * settings.result_max
  }, 0)

  return roundTo(total)
}

export interface CompetitionLeaderboardRow {
  entry: CompetitionEntry
  averageScore: number
  displayScore: number
  adjustedScore: number
  ratingsCount: number
  isEligibleForPlacement: boolean
  ratingsNeededForPlacement: number
  overallAverageScore: number
  ratingDetails: CompetitionLeaderboardRatingDetail[]
}

export interface CompetitionLeaderboardRatingDetail {
  ratingId: string
  guestName: string | null
  totalScore: number
  createdAt: string
}

export function buildCompetitionLeaderboard(
  competition: Pick<Competition, "rating_criteria" | "leaderboard_settings">,
  entries: CompetitionEntry[],
  ratings: CompetitionEntryRating[],
) {
  const settings = normalizeLeaderboardSettings(competition.leaderboard_settings)
  const minimumRatingsRequiredForPlacement = getMinimumRatingsRequiredForPlacement(competition.leaderboard_settings)

  const ratingTotalsByEntry = new Map<string, number[]>()
  const ratingDetailsByEntry = new Map<string, CompetitionLeaderboardRatingDetail[]>()
  ratings.forEach((rating) => {
    const total = calculateWeightedRatingScore(rating.scores || {}, competition.rating_criteria, settings)
    const existing = ratingTotalsByEntry.get(rating.entry_id) || []
    existing.push(total)
    ratingTotalsByEntry.set(rating.entry_id, existing)

    const existingDetails = ratingDetailsByEntry.get(rating.entry_id) || []
    existingDetails.push({
      ratingId: rating.id,
      guestName: rating.guest_name,
      totalScore: total,
      createdAt: rating.created_at,
    })
    ratingDetailsByEntry.set(rating.entry_id, existingDetails)
  })

  const baseRows = entries.map((entry) => {
    const totals = ratingTotalsByEntry.get(entry.id) || []
    const ratingDetails = (ratingDetailsByEntry.get(entry.id) || []).sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    )
    const ratingsCount = totals.length
    const averageScore = ratingsCount > 0 ? roundTo(totals.reduce((sum, value) => sum + value, 0) / ratingsCount) : 0

    return {
      entry,
      averageScore,
      displayScore: averageScore,
      adjustedScore: averageScore,
      ratingsCount,
      isEligibleForPlacement: ratingsCount >= minimumRatingsRequiredForPlacement,
      ratingsNeededForPlacement: Math.max(0, minimumRatingsRequiredForPlacement - ratingsCount),
      overallAverageScore: 0,
      ratingDetails,
    }
  })

  const ratedRows = baseRows.filter((row) => row.ratingsCount > 0)
  const overallAverage =
    ratedRows.length > 0
      ? roundTo(ratedRows.reduce((sum, row) => sum + row.averageScore, 0) / ratedRows.length)
      : 0

  const rows = baseRows.map((row) => {
    if (settings.scoring_method !== "behzod_formula") {
      return row
    }

    const v = row.ratingsCount
    const m = settings.minimum_ratings_threshold
    const adjustedScore =
      v === 0 && m === 0
        ? row.averageScore
        : roundTo((v / (v + m)) * row.averageScore + (m / (v + m)) * overallAverage)

    return {
      ...row,
      adjustedScore,
      displayScore: adjustedScore,
      overallAverageScore: overallAverage,
    }
  })

  return rows.sort((left, right) => {
    if (left.isEligibleForPlacement !== right.isEligibleForPlacement) {
      return left.isEligibleForPlacement ? -1 : 1
    }

    if (right.displayScore !== left.displayScore) {
      return right.displayScore - left.displayScore
    }

    if (!left.isEligibleForPlacement && left.ratingsNeededForPlacement !== right.ratingsNeededForPlacement) {
      return left.ratingsNeededForPlacement - right.ratingsNeededForPlacement
    }

    if (right.ratingsCount !== left.ratingsCount) {
      return right.ratingsCount - left.ratingsCount
    }

    return left.entry.entry_name.localeCompare(right.entry.entry_name)
  })
}

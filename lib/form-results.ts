import type { Form, FormField } from "@/lib/types"
import { parseFormImageAnswer } from "@/lib/form-image-storage"
import { getSortedFormFields, isAnswerableFormField } from "@/lib/form-schema"

export interface FormResponseRecord {
  id: string
  form_id: string
  status: string
  answers: Record<string, unknown>
  created_at: string
}

interface FieldMeta {
  id: string
  key: string
  label: string
  type: FormField["type"]
}

export interface OptionStat {
  label: string
  count: number
  percentage: number
}

export interface RankedBreakdown {
  option: string
  positions: number[]
}

export type PublicFieldAnalytics =
  | {
      type: "text" | "email" | "image"
      field: FieldMeta
      responseCount: number
      completionRate: number
      values: string[]
    }
  | {
      type: "select" | "multi_select" | "boolean"
      field: FieldMeta
      responseCount: number
      completionRate: number
      options: OptionStat[]
    }
  | {
      type: "rating"
      field: FieldMeta
      responseCount: number
      completionRate: number
      average: number | null
      min: number | null
      max: number | null
      distribution: Array<{ label: string; count: number; percentage: number }>
    }
  | {
      type: "ranked"
      field: FieldMeta
      responseCount: number
      completionRate: number
      firstChoice: OptionStat[]
      positionBreakdown: RankedBreakdown[]
      pluralityWinner: string
      irvWinner: string
      bordaWinner: string
    }

export interface PublicFormResultsData {
  totalResponses: number
  fieldCount: number
  latestResponse: string | null
  statusCounts: OptionStat[]
  analytics: PublicFieldAnalytics[]
}

const BORDA_POINTS = [5, 4, 3, 2, 1]

const roundPercentage = (count: number, total: number) => {
  if (total === 0) return 0
  return Number(((count / total) * 100).toFixed(1))
}

const normalizeFieldMeta = (field: FormField): FieldMeta => ({
  id: field.id,
  key: field.key,
  label: field.label,
  type: field.type,
})

const getFieldValues = (responses: FormResponseRecord[], fieldKey: string) =>
  responses.map((response) => response.answers?.[fieldKey]).filter((value) => value !== undefined)

const getFieldOptions = (field: FormField, values: unknown[]) => {
  const schemaOptions = field.options || []
  const answerOptions = values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => (typeof value === "string" ? value : null))
    .filter(Boolean) as string[]

  return Array.from(new Set([...schemaOptions, ...answerOptions]))
}

const buildCountStats = (labels: string[], counts: Map<string, number>, total: number): OptionStat[] =>
  labels.map((label) => ({
    label,
    count: counts.get(label) || 0,
    percentage: roundPercentage(counts.get(label) || 0, total),
  }))

const runInstantRunoff = (ballots: string[][], options: string[]) => {
  const activeOptions = new Set(options)
  let currentBallots = ballots.map((ballot) => ballot.filter((candidate) => activeOptions.has(candidate)))

  while (activeOptions.size > 1) {
    const counts = new Map<string, number>()
    for (const option of activeOptions) {
      counts.set(option, 0)
    }

    currentBallots.forEach((ballot) => {
      const choice = ballot.find((candidate) => activeOptions.has(candidate))
      if (choice) {
        counts.set(choice, (counts.get(choice) || 0) + 1)
      }
    })

    const totalVotes = Array.from(counts.values()).reduce((sum, count) => sum + count, 0)
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return "-"
    if (sorted[0][1] > totalVotes / 2) return sorted[0][0]

    const minVotes = Math.min(...counts.values())
    const eliminated = Array.from(counts.entries())
      .filter(([, count]) => count === minVotes)
      .map(([candidate]) => candidate)

    eliminated.forEach((candidate) => activeOptions.delete(candidate))
    currentBallots = currentBallots.map((ballot) => ballot.filter((candidate) => activeOptions.has(candidate)))
  }

  return Array.from(activeOptions)[0] || "-"
}

const runBorda = (ballots: string[][], options: string[]) => {
  const scores = new Map<string, number>()
  options.forEach((option) => scores.set(option, 0))

  ballots.forEach((ballot) => {
    ballot.slice(0, BORDA_POINTS.length).forEach((candidate, index) => {
      scores.set(candidate, (scores.get(candidate) || 0) + BORDA_POINTS[index])
    })
  })

  const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || "-"
}

export function buildPublicFormResults(form: Form, responses: FormResponseRecord[]): PublicFormResultsData {
  const sortedFields = getSortedFormFields(form)
  const publicAnalyticsFields = sortedFields.filter((field) => !field.is_secure)
  const answerableFields = publicAnalyticsFields.filter(isAnswerableFormField)
  const totalResponses = responses.length
  const latestResponse = responses[0]?.created_at || null

  const statusCountMap = new Map<string, number>()
  responses.forEach((response) => {
    statusCountMap.set(response.status, (statusCountMap.get(response.status) || 0) + 1)
  })

  const statusCounts = Array.from(statusCountMap.entries()).map(([label, count]) => ({
    label,
    count,
    percentage: roundPercentage(count, totalResponses),
  }))

  const analytics: PublicFieldAnalytics[] = answerableFields.map((field) => {
    const values = getFieldValues(responses, field.key)
    const responseCount = values.length
    const completionRate = roundPercentage(responseCount, totalResponses)
    const fieldMeta = normalizeFieldMeta(field)

    if (field.type === "text" || field.type === "email") {
      return {
        type: field.type,
        field: fieldMeta,
        responseCount,
        completionRate,
        values: values.map((value) => (typeof value === "string" ? value : JSON.stringify(value))),
      }
    }

    if (field.type === "image") {
      const imageUrls = values
        .map((value) => parseFormImageAnswer(value)?.url || null)
        .filter(Boolean) as string[]

      return {
        type: "image",
        field: fieldMeta,
        responseCount: imageUrls.length,
        completionRate: roundPercentage(imageUrls.length, totalResponses),
        values: imageUrls,
      }
    }

    if (field.type === "select") {
      const options = getFieldOptions(field, values)
      const counts = new Map<string, number>()
      values.forEach((value) => {
        if (typeof value === "string") {
          counts.set(value, (counts.get(value) || 0) + 1)
        }
      })

      return {
        type: "select",
        field: fieldMeta,
        responseCount,
        completionRate,
        options: buildCountStats(options, counts, responseCount),
      }
    }

    if (field.type === "multi_select") {
      const options = getFieldOptions(field, values)
      const counts = new Map<string, number>()
      values.forEach((value) => {
        if (!Array.isArray(value)) return
        value.forEach((option) => {
          if (typeof option === "string") {
            counts.set(option, (counts.get(option) || 0) + 1)
          }
        })
      })

      if (field.is_ranked) {
        const ballots = values.filter(Array.isArray) as string[][]
        const maxRank = Math.max(1, ...ballots.map((ballot) => ballot.length))
        const positionBreakdown = options.map((option) => ({
          option,
          positions: Array.from({ length: maxRank }, (_, index) =>
            ballots.filter((ballot) => ballot[index] === option).length,
          ),
        }))
        const firstChoiceCounts = new Map<string, number>()
        ballots.forEach((ballot) => {
          const firstChoice = ballot[0]
          if (firstChoice) {
            firstChoiceCounts.set(firstChoice, (firstChoiceCounts.get(firstChoice) || 0) + 1)
          }
        })

        const firstChoice = buildCountStats(options, firstChoiceCounts, ballots.length)
        const pluralityWinner = firstChoice.sort((a, b) => b.count - a.count)[0]?.label || "-"
        const irvWinner = runInstantRunoff(ballots, options)
        const bordaWinner = runBorda(ballots, options)

        return {
          type: "ranked",
          field: fieldMeta,
          responseCount,
          completionRate,
          firstChoice,
          positionBreakdown,
          pluralityWinner,
          irvWinner,
          bordaWinner,
        }
      }

      return {
        type: "multi_select",
        field: fieldMeta,
        responseCount,
        completionRate,
        options: buildCountStats(options, counts, responseCount),
      }
    }

    if (field.type === "boolean") {
      const counts = new Map<string, number>()
      values.forEach((value) => {
        if (value === true) counts.set("Yes", (counts.get("Yes") || 0) + 1)
        if (value === false) counts.set("No", (counts.get("No") || 0) + 1)
      })

      return {
        type: "boolean",
        field: fieldMeta,
        responseCount,
        completionRate,
        options: buildCountStats(["Yes", "No"], counts, responseCount),
      }
    }

    const numericValues = values
      .map((value) => (typeof value === "number" ? value : Number(value)))
      .filter((value) => Number.isFinite(value)) as number[]
    const distributionCounts = new Map<string, number>()
    numericValues.forEach((value) => {
      const label = String(value)
      distributionCounts.set(label, (distributionCounts.get(label) || 0) + 1)
    })

    const distribution = Array.from(distributionCounts.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([label, count]) => ({
        label,
        count,
        percentage: roundPercentage(count, numericValues.length),
      }))

    return {
      type: "rating",
      field: fieldMeta,
      responseCount,
      completionRate,
      average:
        numericValues.length > 0
          ? Number((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(2))
          : null,
      min: numericValues.length > 0 ? Math.min(...numericValues) : null,
      max: numericValues.length > 0 ? Math.max(...numericValues) : null,
      distribution,
    }
  })

  return {
    totalResponses,
    fieldCount: answerableFields.length,
    latestResponse,
    statusCounts,
    analytics,
  }
}

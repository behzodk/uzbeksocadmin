import { parseFormImageAnswer } from "@/lib/form-image-storage"
import type { FormResponseRecord } from "@/lib/form-results"
import type { FormField } from "@/lib/types"

export interface PublicResultsField {
  id: string
  key: string
  label: string
  isSecure: boolean
  isRanked: boolean
  type: FormField["type"]
}
export interface PublicResultsRow {
  id: string
  number: number
  submittedAt: string
  submittedLabel: string
  submittedDate: string
  status: string
  values: Record<string, string>
  choices: Record<string, string[]>
}
const londonDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
export const getLondonDay = (value: string | number) => londonDay.format(new Date(value))
export const formatResultsDate = (value: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    ...options,
  }).format(new Date(value))

export function buildActivity(rows: PublicResultsRow[], now: number) {
  const counts = new Map<string, number>()
  const hours = Array.from({ length: 24 }, () => 0)
  let recent = 0
  let latest = ""
  for (const row of rows) {
    const stamp = Date.parse(row.submittedAt)
    if (!Number.isFinite(stamp)) continue
    const day = getLondonDay(row.submittedAt)
    counts.set(day, (counts.get(day) || 0) + 1)
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date(stamp)),
    )
    hours[hour]++
    if (stamp > now - 86400000 && stamp <= now) recent++
    if (!latest || stamp > Date.parse(latest)) latest = row.submittedAt
  }
  const dates = [...counts.keys()].sort()
  const monthly =
    dates.length > 0 && Date.parse(dates[dates.length - 1]) - Date.parse(dates[0]) > 366 * 86400000
  const bucketCounts = new Map<string, number>()
  for (const [day, count] of counts) {
    const key = monthly ? day.slice(0, 7) : day
    bucketCounts.set(key, (bucketCounts.get(key) || 0) + count)
  }
  const points: Array<{ date: string; label: string; count: number; cumulative: number }> = []
  if (dates.length) {
    const cursor = new Date(`${dates[0]}T12:00:00Z`)
    const end = dates[dates.length - 1]
    if (monthly) cursor.setUTCDate(1)
    let cumulative = 0
    while (cursor.toISOString().slice(0, 10) <= end) {
      const date = cursor.toISOString().slice(0, monthly ? 7 : 10)
      const count = bucketCounts.get(date) || 0
      cumulative += count
      points.push({
        date,
        label: formatResultsDate(
          cursor.toISOString(),
          monthly ? { day: undefined, month: "short", year: "2-digit" } : {},
        ),
        count,
        cumulative,
      })
      if (monthly) cursor.setUTCMonth(cursor.getUTCMonth() + 1)
      else cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }
  const peakDay = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  const peakHour = hours.every((value) => value === 0) ? null : hours.indexOf(Math.max(...hours))
  return { points, monthly, recent, latest, peakDay, peakHour, hours }
}

export function buildChoiceSummary(field: PublicResultsField, rows: PublicResultsRow[]) {
  if (field.isSecure) return null
  if (!["select", "multi_select", "boolean", "rating"].includes(field.type)) return null
  const counts = new Map<string, number>()
  const ranks = new Map<string, number[]>()
  let answered = 0
  for (const row of rows) {
    const list = row.choices[field.key]
    const scalar = row.values[field.key]
    const values = list || (scalar && scalar !== "—" ? [scalar] : [])
    if (!values.length) continue
    answered++
    const counted = field.isRanked ? values.slice(0, 1) : [...new Set(values)]
    counted.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1))
    if (field.isRanked)
      values.forEach((value, index) => {
        const positions = ranks.get(value) || []
        positions[index] = (positions[index] || 0) + 1
        ranks.set(value, positions)
      })
  }
  const options = [...new Set([...counts.keys(), ...ranks.keys()])]
    .map((label) => {
      const positions = ranks.get(label) || []
      const totalRanks = positions.reduce((sum, count) => sum + count, 0)
      return {
        label,
        count: counts.get(label) || 0,
        positions: Array.from(
          { length: Math.max(0, ...[...ranks.values()].map((value) => value.length)) },
          (_, i) => positions[i] || 0,
        ),
        averageRank: totalRanks
          ? positions.reduce((sum, count, i) => sum + count * (i + 1), 0) / totalRanks
          : null,
      }
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        (a.averageRank ?? Infinity) - (b.averageRank ?? Infinity) ||
        a.label.localeCompare(b.label),
    )
  return { answered, options }
}

/** Build the public payload. Protected answers are removed before serialization. */
export function buildPublicResultsRows(
  schemaFields: FormField[],
  responses: FormResponseRecord[],
): PublicResultsRow[] {
  return responses.map((response, index) => {
    const values: Record<string, string> = {}
    const choices: Record<string, string[]> = {}
    for (const field of schemaFields) {
      const raw = response.answers?.[field.key]
      if (raw === undefined || raw === null || raw === "") {
        values[field.key] = "—"
        continue
      }
      // Mask on the server. Raw protected answers must never reach the client.
      if (field.is_secure) {
        values[field.key] = "••••••••"
        continue
      }
      if (Array.isArray(raw)) {
        choices[field.key] = raw.filter((value): value is string => typeof value === "string")
        values[field.key] = choices[field.key].join(", ")
      } else if (field.type === "image") values[field.key] = parseFormImageAnswer(raw)?.url || "—"
      else if (typeof raw === "boolean") values[field.key] = raw ? "Yes" : "No"
      else values[field.key] = typeof raw === "object" ? JSON.stringify(raw) : String(raw)
    }
    return {
      id: response.id,
      number: responses.length - index,
      submittedAt: response.created_at,
      submittedDate: getLondonDay(response.created_at),
      submittedLabel: formatResultsDate(response.created_at, {
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: response.status,
      values,
      choices,
    }
  })
}

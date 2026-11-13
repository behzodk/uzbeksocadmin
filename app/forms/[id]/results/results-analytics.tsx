"use client"
import { useMemo } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, Clock3, CalendarDays, Users } from "lucide-react"
import {
  buildActivity,
  buildChoiceSummary,
  formatResultsDate,
  type PublicResultsField,
  type PublicResultsRow,
} from "@/lib/results-workspace"

export function ResultsAnalytics({
  fields,
  rows,
  total,
  capacity,
  now,
  filtered,
}: {
  fields: PublicResultsField[]
  rows: PublicResultsRow[]
  total: number
  capacity?: number | null
  now: number
  filtered: boolean
}) {
  const activity = useMemo(() => buildActivity(rows, now), [rows, now])
  const choices = useMemo(
    () =>
      fields
        .map((field) => ({ field, summary: buildChoiceSummary(field, rows) }))
        .filter((item) => item.summary && item.summary.answered > 0),
    [fields, rows],
  )
  const stats = [
    {
      label: filtered ? "Matching responses" : "Total responses",
      value: rows.length.toLocaleString("en-GB"),
      sub: filtered ? `of ${total} total responses` : "Across this form",
      icon: Users,
    },
    {
      label: "Last 24 hours",
      value: activity.recent.toLocaleString("en-GB"),
      sub: "From the matching records",
      icon: TrendingUp,
    },
    {
      label: "Peak registration day",
      value: activity.peakDay ? formatResultsDate(`${activity.peakDay[0]}T12:00:00Z`) : "—",
      sub: activity.peakDay ? `${activity.peakDay[1]} responses` : "No responses yet",
      icon: CalendarDays,
    },
    {
      label: "Busiest hour",
      value:
        activity.peakHour === null
          ? "—"
          : `${String(activity.peakHour).padStart(2, "0")}:00–${String(activity.peakHour + 1).padStart(2, "0")}:00`,
      sub: "London time · across all days",
      icon: Clock3,
    },
  ]
  return (
    <section className="results-insights" aria-labelledby="insights-heading">
      <div className="results-section-heading">
        <div>
          <p className="results-overline">Response insights</p>
          <h2 id="insights-heading">Registration overview</h2>
        </div>
        <p>
          {filtered ? `${rows.length} matching records · filters applied` : "All responses"} · London time
        </p>
      </div>
      <div className="results-stat-grid">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <article className="results-stat" key={label}>
            <div>
              <p>{label}</p>
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>{sub}</small>
          </article>
        ))}
      </div>
      <div className="results-insight-meta">
        <span>
          Latest submission:{" "}
          <strong>
            {activity.latest
              ? formatResultsDate(activity.latest, { year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "No data"}
          </strong>
        </span>
        {capacity !== null && capacity !== undefined && (
          <span>
            Form capacity:{" "}
            <strong>
              {total} / {capacity}
            </strong>{" "}
            · {capacity > 0 ? `${Math.round((total / capacity) * 100)}% used` : "No places available"} (all
            records)
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="results-empty">No response activity for the current filters.</div>
      ) : (
        <>
          <div className="results-chart-grid">
            <article className="results-chart-card">
              <div className="results-chart-title">
                <h3>Registration activity</h3>
                <span>Responses per {activity.monthly ? "month" : "day"}</span>
              </div>
              <div
                className="results-chart"
                role="img"
                aria-label={`Registration activity across ${activity.points.length} ${activity.monthly ? "months" : "days"}. Exact counts are available below.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activity.points} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf4" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#657188" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#657188" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      labelFormatter={(_, payload) => payload[0]?.payload.date}
                      contentStyle={{ borderRadius: 10, borderColor: "#e0e6ef", fontSize: 12 }}
                    />
                    <Bar
                      dataKey="count"
                      name="Responses"
                      fill="#4278dd"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="results-chart-card">
              <div className="results-chart-title">
                <h3>Cumulative responses</h3>
                <span>Growth over time</span>
              </div>
              <div
                className="results-chart"
                role="img"
                aria-label={`Cumulative registrations, ending at ${rows.length} responses. Exact counts are available below.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activity.points} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf4" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#657188" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#657188" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      labelFormatter={(_, payload) => payload[0]?.payload.date}
                      contentStyle={{ borderRadius: 10, borderColor: "#e0e6ef", fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      name="Total responses"
                      stroke="#287d79"
                      strokeWidth={2.5}
                      dot={activity.points.length < 3}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
          <details className="results-chart-data">
            <summary>View activity data</summary>
            <div className="results-distribution-scroll">
              <table>
                <caption className="sr-only">Exact values for both activity charts</caption>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Responses</th>
                    <th>Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.points.map((point) => (
                    <tr key={point.date}>
                      <td>{point.date}</td>
                      <td>{point.count}</td>
                      <td>{point.cumulative}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
      {choices.length > 0 && (
        <div className="results-choice-insights">
          {choices.map(
            ({ field, summary }) =>
              summary && (
                <article className="results-chart-card" key={field.id}>
                  <div className="results-chart-title">
                    <h3>{field.label}</h3>
                    <span>{field.isRanked ? "First-choice preferences" : "Answer distribution"}</span>
                  </div>
                  <p className="results-insight-note">
                    {summary.answered} answered ·{" "}
                    {field.isRanked
                      ? "Sorted by first-choice votes. Full rank distribution below."
                      : field.type === "multi_select"
                        ? "Percentages are of respondents who answered; multiple choices can exceed 100% in total."
                        : "Percentages are of respondents who answered."}
                  </p>
                  <div className="results-option-bars">
                    {summary.options.map((option) => (
                      <div key={option.label}>
                        <div className="results-option-label">
                          <span>{option.label}</span>
                          <strong>
                            {option.count}{" "}
                            <small>· {Math.round((option.count / summary.answered) * 100)}%</small>
                          </strong>
                        </div>
                        <meter
                          value={option.count}
                          min={0}
                          max={summary.answered}
                          aria-label={`${option.label}: ${option.count} of ${summary.answered}`}
                        />
                      </div>
                    ))}
                  </div>
                  {field.isRanked && (
                    <details className="results-rank-distribution">
                      <summary>Rank distribution & average position</summary>
                      <div className="results-distribution-scroll">
                        <table>
                          <caption className="sr-only">
                            Number of respondents placing each choice at each rank. Lower average rank
                            indicates a higher preference.
                          </caption>
                          <thead>
                            <tr>
                              <th>Choice</th>
                              {summary.options[0]?.positions.map((_, i) => (
                                <th key={i}>#{i + 1}</th>
                              ))}
                              <th>Avg. rank</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.options.map((option) => (
                              <tr key={option.label}>
                                <th scope="row">{option.label}</th>
                                {option.positions.map((value, i) => (
                                  <td key={i}>{value}</td>
                                ))}
                                <td>{option.averageRank?.toFixed(1) || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </article>
              ),
          )}
        </div>
      )}
    </section>
  )
}

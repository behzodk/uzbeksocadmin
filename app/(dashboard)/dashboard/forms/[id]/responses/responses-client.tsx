"use client"

import { useMemo } from "react"
import type { Form, FormField } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Activity, Calendar, Inbox, ArrowLeft, Download } from "lucide-react"
import Link from "next/link"

interface FormResponsesClientProps {
  form: Form
  responses: Array<{
    id: string
    form_id: string
    status: string
    answers: Record<string, unknown>
    created_at: string
  }>
}

const RANK_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]
const BORDA_POINTS = [5, 4, 3, 2, 1]

const truncateLabel = (value: string, max = 28) => {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function renderValue(value: unknown) {
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {value.map((item, index) => (
          <li key={index}>{String(item)}</li>
        ))}
      </ul>
    )
  }

  if (value && typeof value === "object") {
    return (
      <pre className="text-xs whitespace-pre-wrap break-words bg-muted/40 p-3 rounded-md">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }

  return <span className="text-sm text-foreground">{value ? String(value) : "-"}</span>
}

function getFieldOptions(field: FormField, values: unknown[]) {
  const fromSchema = field.options || []
  const fromAnswers = values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => (typeof value === "string" ? value : null))
    .filter(Boolean) as string[]

  const combined = [...fromSchema, ...fromAnswers]
  return Array.from(new Set(combined))
}

export function FormResponsesClient({ form, responses }: FormResponsesClientProps) {
  const sortedFields = useMemo(() => {
    const fields = form.schema?.fields || []
    return [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [form.schema?.fields])

  const totalResponses = responses.length
  const latestResponse = responses[0]?.created_at

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    responses.forEach((response) => {
      counts[response.status] = (counts[response.status] || 0) + 1
    })
    return counts
  }, [responses])

  const analytics = useMemo(() => {
    return sortedFields.map((field) => {
      const values = responses
        .map((response) => response.answers?.[field.key])
        .filter((value) => value !== undefined)

      if (field.type === "select") {
        const options = getFieldOptions(field, values)
        const counts = options.map((option) => ({
          option,
          count: values.filter((value) => value === option).length,
        }))
        return { field, type: "select" as const, counts }
      }

      if (field.type === "multi_select") {
        const options = getFieldOptions(field, values)
        if (field.is_ranked) {
          const maxRank = Math.max(1, ...values.map((value) => (Array.isArray(value) ? value.length : 0)))
          const rankCounts = options.map((option) => {
            const entry: Record<string, number | string> = { option }
            for (let i = 0; i < maxRank; i += 1) {
              entry[`rank_${i + 1}`] = 0
            }
            return entry
          })

          values.forEach((value) => {
            if (!Array.isArray(value)) return
            value.forEach((option, index) => {
              const target = rankCounts.find((row) => row.option === option)
              if (!target) return
              const key = `rank_${index + 1}`
              target[key] = ((target[key] as number) || 0) + 1
            })
          })

          return { field, type: "ranked" as const, rankCounts, maxRank, values, options }
        }

        const counts = options.map((option) => ({
          option,
          count: values.filter((value) => Array.isArray(value) && value.includes(option)).length,
        }))
        return { field, type: "multi_select" as const, counts }
      }

      if (field.type === "boolean") {
        const trueCount = values.filter((value) => value === true).length
        const falseCount = values.filter((value) => value === false).length
        return {
          field,
          type: "boolean" as const,
          counts: [
            { option: "True", count: trueCount },
            { option: "False", count: falseCount },
          ],
        }
      }

      if (field.type === "rating") {
        const numericValues = values
          .map((value) => (typeof value === "number" ? value : Number(value)))
          .filter((value) => Number.isFinite(value)) as number[]

        const countsMap = new Map<number, number>()
        numericValues.forEach((value) => {
          countsMap.set(value, (countsMap.get(value) || 0) + 1)
        })

        const counts = Array.from(countsMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([value, count]) => ({ value, count }))

        const average =
          numericValues.length > 0 ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length : null

        const min = numericValues.length > 0 ? Math.min(...numericValues) : null
        const max = numericValues.length > 0 ? Math.max(...numericValues) : null

        return { field, type: "rating" as const, counts, average, min, max }
      }

      return {
        field,
        type: "text" as const,
        total: values.length,
      }
    })
  }, [responses, sortedFields])

  const electionStats = useMemo(() => {
    return analytics
      .filter((entry) => entry.type === "ranked")
      .map((entry) => {
        const options = entry.options as string[]
        const ballots = (entry.values as unknown[]).filter(Array.isArray) as string[][]

        const pluralityCounts = options.map((option) => ({
          option,
          count: ballots.filter((ballot) => ballot[0] === option).length,
        }))
        const pluralityWinner =
          pluralityCounts.length > 0
            ? pluralityCounts.reduce((winner, current) => (current.count > winner.count ? current : winner))
            : { option: "-", count: 0 }

        const runIRV = () => {
          let activeOptions = new Set(options)
          let rounds: Array<{ counts: Record<string, number>; eliminated: string[] }> = []
          let currentBallots = ballots.map((ballot) => ballot.filter((candidate) => activeOptions.has(candidate)))

          while (activeOptions.size > 1) {
            const counts: Record<string, number> = {}
            Array.from(activeOptions).forEach((candidate) => {
              counts[candidate] = 0
            })

            currentBallots.forEach((ballot) => {
              const choice = ballot.find((candidate) => activeOptions.has(candidate))
              if (choice) counts[choice] += 1
            })

            const totalVotes = Object.values(counts).reduce((sum, value) => sum + value, 0)
            const majority = totalVotes / 2
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
            if (sorted.length > 0 && sorted[0][1] > majority) {
              rounds.push({ counts, eliminated: [] })
              return { winner: sorted[0][0], rounds }
            }

            const minVotes = Math.min(...Object.values(counts))
            const eliminated = Object.entries(counts)
              .filter(([, count]) => count === minVotes)
              .map(([candidate]) => candidate)

            eliminated.forEach((candidate) => activeOptions.delete(candidate))
            rounds.push({ counts, eliminated })

            currentBallots = currentBallots.map((ballot) => ballot.filter((candidate) => activeOptions.has(candidate)))
            if (activeOptions.size === 0) break
          }

          const remaining = Array.from(activeOptions)
          return { winner: remaining[0] || "-", rounds }
        }

        const irvResult = runIRV()

        const bordaScores = options.map((option) => {
          let score = 0
          ballots.forEach((ballot) => {
            ballot.slice(0, BORDA_POINTS.length).forEach((candidate, index) => {
              if (candidate === option) {
                score += BORDA_POINTS[index]
              }
            })
          })
          return { option, score }
        })
        const bordaWinner =
          bordaScores.length > 0
            ? bordaScores.reduce((winner, current) => (current.score > winner.score ? current : winner))
            : { option: "-", score: 0 }

        return {
          field: entry.field,
          plurality: { counts: pluralityCounts, winner: pluralityWinner },
          irv: irvResult,
          borda: { scores: bordaScores, winner: bordaWinner },
        }
      })
  }, [analytics])

  const handleExport = async () => {
    try {
      const ExcelJSModule = await import("exceljs")
      // @ts-ignore
      const ExcelJS = ExcelJSModule.default || ExcelJSModule
      const FileSaverModule = await import("file-saver")
      // @ts-ignore
      const saveAs = FileSaverModule.default || FileSaverModule.saveAs || FileSaverModule

      // @ts-ignore
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Responses")

      const fields = form.schema?.fields || []

      // Define columns
      const columns = [
        { header: "Submitted At", key: "submittedAt", width: 20 },
        { header: "Status", key: "status", width: 15 },
        ...fields.map((field) => ({ header: field.label, key: field.key, width: 25 })),
      ]

      worksheet.columns = columns

      // Add rows
      responses.forEach((response) => {
        const rowData: Record<string, any> = {
          submittedAt: new Date(response.created_at).toLocaleString(),
          status: response.status,
        }

        fields.forEach((field) => {
          const value = response.answers?.[field.key]
          if (Array.isArray(value)) {
            rowData[field.key] = value.join(", ")
          } else {
            rowData[field.key] = value ?? ""
          }
        })

        worksheet.addRow(rowData)
      })

      // Style header row
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0EA5E9" },
      }
      headerRow.alignment = { horizontal: "center", vertical: "middle" }

      // Borders for all cells
      worksheet.eachRow((row: any) => {
        row.eachCell((cell: any) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          }
        })
      })

      // Freeze first row
      worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }]

      // Auto filter
      worksheet.autoFilter = {
        from: {
          row: 1,
          column: 1,
        },
        to: {
          row: 1,
          column: columns.length,
        },
      }

      // Export file
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const filename = `${form.slug || form.title || "form"}-responses.xlsx`

      saveAs(blob, filename)
    } catch (error) {
      console.error("Failed to export:", error)
      alert("Failed to export to Excel. Please ensure exceljs and file-saver are installed.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/forms">
            <Button variant="ghost" className="mb-3 -ml-2 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Forms
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{form.title} Responses</h1>
          <p className="text-muted-foreground mt-1">{totalResponses} total submissions</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Total Responses" value={totalResponses} icon={Inbox} />
        <StatsCard
          title="Latest Response"
          value={latestResponse ? new Date(latestResponse).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}
          icon={Calendar}
        />
        <StatsCard title="Statuses" value={Object.keys(statusCounts).length} icon={Activity} />
      </div>

      {Object.keys(statusCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="rounded-lg border p-4">
                  <p className="text-xs uppercase text-muted-foreground">{status}</p>
                  <p className="text-2xl font-semibold text-foreground mt-2">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analytics.map((entry) => (
        <Card key={entry.field.id}>
          <CardHeader>
            <CardTitle className="text-base">{entry.field.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {entry.type === "text" && (
              <p className="text-sm text-muted-foreground">{entry.total} responses captured.</p>
            )}

            {(entry.type === "select" || entry.type === "multi_select" || entry.type === "boolean") && (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entry.counts} margin={{ left: 8, right: 8 }}>
                    <XAxis dataKey="option" tick={{ fontSize: 12 }} interval={0} tickFormatter={truncateLabel} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {entry.type === "rating" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>Average: {entry.average !== null ? entry.average.toFixed(2) : "-"}</span>
                  <span>Min: {entry.min !== null ? entry.min : "-"}</span>
                  <span>Max: {entry.max !== null ? entry.max : "-"}</span>
                  <span>Total: {(entry.counts || []).reduce((sum, item) => sum + item.count, 0)}</span>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={entry.counts} margin={{ left: 8, right: 8 }}>
                      <XAxis dataKey="value" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {entry.type === "ranked" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Ranked choices distribution by position.</p>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={entry.rankCounts} margin={{ left: 8, right: 8 }}>
                      <XAxis dataKey="option" tick={{ fontSize: 12 }} interval={0} tickFormatter={truncateLabel} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      {Array.from({ length: entry.maxRank }).map((_, index) => (
                        <Bar
                          key={`rank-${index}`}
                          dataKey={`rank_${index + 1}`}
                          stackId="rank"
                          fill={RANK_COLORS[index % RANK_COLORS.length]}
                          name={`Rank ${index + 1}`}
                          radius={index === entry.maxRank - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {electionStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Election Results (Ranked Preference)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {electionStats.map((election) => (
              <div key={election.field.id} className="space-y-4 border rounded-lg p-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{election.field.label}</h3>
                  <p className="text-xs text-muted-foreground">Based on ranked preferences</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Plurality Winner</p>
                    <p className="text-lg font-semibold text-foreground mt-2">{election.plurality.winner.option}</p>
                    <p className="text-xs text-muted-foreground">#1 votes: {election.plurality.winner.count}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Instant-Runoff Winner</p>
                    <p className="text-lg font-semibold text-foreground mt-2">{election.irv.winner}</p>
                    <p className="text-xs text-muted-foreground">Majority required &gt; 50%</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Borda Winner</p>
                    <p className="text-lg font-semibold text-foreground mt-2">{election.borda.winner.option}</p>
                    <p className="text-xs text-muted-foreground">Score: {election.borda.winner.score}</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Plurality (#1 votes)</p>
                    {election.plurality.counts.map((item) => (
                      <div key={item.option} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.option}</span>
                        <span className="font-semibold text-foreground">{item.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Instant-Runoff Rounds</p>
                    {election.irv.rounds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No rounds recorded.</p>
                    ) : (
                      election.irv.rounds.map((round, index) => (
                        <div key={`round-${index}`} className="border rounded-md p-2">
                          <p className="text-xs text-muted-foreground">Round {index + 1}</p>
                          {Object.entries(round.counts).map(([candidate, count]) => (
                            <div key={candidate} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{candidate}</span>
                              <span className="font-semibold text-foreground">{count}</span>
                            </div>
                          ))}
                          {round.eliminated.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Eliminated: {round.eliminated.join(", ")}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Borda Count</p>
                    {election.borda.scores.map((item) => (
                      <div key={item.option} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.option}</span>
                        <span className="font-semibold text-foreground">{item.score}</span>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-2">
                      Points: Rank 1 → 5, Rank 2 → 4, Rank 3 → 3, Rank 4 → 2, Rank 5 → 1
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Raw Responses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {responses.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">No responses yet.</div>
          ) : (
            responses.map((response) => (
              <div key={response.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {new Date(response.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">{response.status}</span>
                </div>
                {response.answers && typeof response.answers === "object" ? (
                  Object.entries(response.answers).map(([key, value]) => (
                    <div key={key} className="grid gap-2 sm:grid-cols-[180px_1fr]">
                      <span className="text-sm font-medium text-foreground">{key}</span>
                      <div className="text-sm text-muted-foreground">{renderValue(value)}</div>
                    </div>
                  ))
                ) : (
                  <pre className="text-xs whitespace-pre-wrap break-words bg-muted/40 p-3 rounded-md">
                    {JSON.stringify(response.answers, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

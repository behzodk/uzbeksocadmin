"use client"
import { useEffect, useMemo, useRef, useState, type SelectHTMLAttributes } from "react"
import {
  Search,
  SlidersHorizontal,
  X,
  LockKeyhole,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  Inbox,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { formatResultsDate, type PublicResultsField, type PublicResultsRow } from "@/lib/results-workspace"
import { ResultsAnalytics } from "./results-analytics"
export type { PublicResultsField, PublicResultsRow } from "@/lib/results-workspace"
interface PublicResultsTableProps {
  fields: PublicResultsField[]
  rows: PublicResultsRow[]
  capacity?: number | null
  now: number
}

function ResultsSelect({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="results-select">
      <select {...props}>{children}</select>
      <ChevronDown size={16} aria-hidden="true" />
    </span>
  )
}

type SortOption = "newest" | "oldest" | "status_asc" | "status_desc"

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"]
const isHttpUrl = (value: string) => value.startsWith("http://") || value.startsWith("https://")

export function PublicResultsTable({ fields, rows, capacity, now }: PublicResultsTableProps) {
  const [globalSearch, setGlobalSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [pageSize, setPageSize] = useState("25")
  const [page, setPage] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [detail, setDetail] = useState<{ row: PublicResultsRow; field: PublicResultsField } | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.status))).sort(), [rows])
  const fieldKeyLookup = useMemo(
    () => new Map(fields.map((field) => [field.key.toLowerCase(), field.key])),
    [fields],
  )

  const clearFilters = () => {
    setGlobalSearch("")
    setStatusFilter("all")
    setFromDate("")
    setToDate("")
    setColumnFilters({})
    setSortBy("newest")
    setPage(1)
  }

  const hasActiveFilters = Boolean(
    globalSearch.trim() ||
    statusFilter !== "all" ||
    fromDate ||
    toDate ||
    Object.values(columnFilters).some((value) => value.trim()),
  )

  const filteredRows = useMemo(() => {
    const normalizedGlobal = globalSearch.trim().toLowerCase()
    const hasGlobalSearch = normalizedGlobal.length > 0

    return rows.filter((row) => {
      const submittedDate = row.submittedDate
      if (statusFilter !== "all" && row.status !== statusFilter) return false
      if (fromDate && submittedDate < fromDate) return false
      if (toDate && submittedDate > toDate) return false

      for (const field of fields) {
        const filterValue = columnFilters[field.key]?.trim().toLowerCase()
        if (!filterValue) continue
        const rowValue = (row.values[field.key] || "").toLowerCase()
        if (!rowValue.includes(filterValue)) return false
      }

      if (!hasGlobalSearch) return true

      const searchableParts = [row.submittedLabel, row.status, ...Object.values(row.values)].map((part) =>
        part.toLowerCase(),
      )
      const tokens = normalizedGlobal.split(/\s+/).filter(Boolean)

      for (const token of tokens) {
        const tokenParts = token.split(":")
        if (tokenParts.length > 1) {
          const prefix = tokenParts[0].trim().toLowerCase()
          const value = tokenParts.slice(1).join(":").trim().toLowerCase()
          if (!value) continue

          if (prefix === "status") {
            if (!row.status.toLowerCase().includes(value)) return false
            continue
          }

          if (prefix === "date") {
            if (!submittedDate.includes(value) && !row.submittedLabel.toLowerCase().includes(value))
              return false
            continue
          }

          const fieldKey = fieldKeyLookup.get(prefix)
          if (fieldKey) {
            const rowValue = (row.values[fieldKey] || "").toLowerCase()
            if (!rowValue.includes(value)) return false
            continue
          }
        }

        const tokenMatch = searchableParts.some((part) => part.includes(token))
        if (!tokenMatch) return false
      }

      return true
    })
  }, [columnFilters, fieldKeyLookup, fields, fromDate, globalSearch, rows, statusFilter, toDate])

  const sortedRows = useMemo(() => {
    const cloned = [...filteredRows]
    if (sortBy === "newest") {
      return cloned.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    }
    if (sortBy === "oldest") {
      return cloned.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    }
    if (sortBy === "status_asc") {
      return cloned.sort(
        (a, b) =>
          a.status.localeCompare(b.status) ||
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      )
    }
    return cloned.sort(
      (a, b) =>
        b.status.localeCompare(a.status) ||
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    )
  }, [filteredRows, sortBy])

  const pageSizeNumber = Number(pageSize)
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSizeNumber))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSizeNumber
    return sortedRows.slice(start, start + pageSizeNumber)
  }, [page, pageSizeNumber, sortedRows])

  const updateColumnFilter = (key: string, value: string) => {
    setPage(1)
    setColumnFilters((prev) => ({ ...prev, [key]: value }))
  }

  const detailTrigger = useRef<HTMLButtonElement | null>(null)
  const openDetail = (row: PublicResultsRow, field: PublicResultsField, trigger: HTMLButtonElement) => {
    detailTrigger.current = trigger
    setDetail({ row, field })
  }
  const chips: Array<{ key: string; label: string; clear: () => void }> = []
  if (globalSearch.trim())
    chips.push({
      key: "search",
      label: `Search: ${globalSearch}`,
      clear: () => {
        setGlobalSearch("")
        setPage(1)
      },
    })
  if (statusFilter !== "all")
    chips.push({
      key: "status",
      label: `Status: ${statusFilter}`,
      clear: () => {
        setStatusFilter("all")
        setPage(1)
      },
    })
  if (fromDate)
    chips.push({
      key: "from",
      label: `From ${fromDate}`,
      clear: () => {
        setFromDate("")
        setPage(1)
      },
    })
  if (toDate)
    chips.push({
      key: "to",
      label: `To ${toDate}`,
      clear: () => {
        setToDate("")
        setPage(1)
      },
    })
  fields.forEach((field) => {
    if (columnFilters[field.key]?.trim())
      chips.push({
        key: field.key,
        label: `${field.label}: ${columnFilters[field.key]}`,
        clear: () => updateColumnFilter(field.key, ""),
      })
  })
  const columnWidth = (field: PublicResultsField) =>
    field.type === "multi_select"
      ? 320
      : field.type === "image"
        ? 130
        : field.type === "email" || field.type === "text"
          ? 180
          : 150
  const tableWidth = 195 + 115 + fields.reduce((sum, field) => sum + columnWidth(field), 0)

  function renderCell(row: PublicResultsRow, field: PublicResultsField) {
    const value = row.values[field.key] || "—"
    if (field.isSecure && value !== "—")
      return (
        <span className="results-masked">
          <LockKeyhole size={13} />
          <span aria-label="Protected answer">••••••••</span>
        </span>
      )
    const choices = row.choices[field.key]
    if (choices?.length)
      return (
        <div className="results-choice-cell">
          {field.isRanked ? (
            <ol className="results-ranking-preview">
              {choices.slice(0, 2).map((choice, i) => (
                <li key={i}>
                  <span className="results-rank" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span title={choice}>{choice}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="results-answer-chips">
              {choices.slice(0, 2).map((choice, i) => (
                <span key={i} title={choice}>
                  {choice}
                </span>
              ))}
            </div>
          )}
          {(choices.length > 2 || choices.some((choice) => choice.length > 35)) && (
            <button
              className="results-text-button"
              onClick={(event) => openDetail(row, field, event.currentTarget)}
            >
              View all {choices.length}{" "}
              {field.isRanked
                ? choices.length === 1
                  ? "choice"
                  : "choices"
                : choices.length === 1
                  ? "selection"
                  : "selections"}
            </button>
          )}
        </div>
      )
    if (field.type === "image" && isHttpUrl(value))
      return (
        <a href={value} target="_blank" rel="noreferrer" className="results-image-link">
          <img src={value} alt={`${field.label} submission`} />
          <span>Open image</span>
        </a>
      )
    return (
      <div className="results-text-cell">
        <span className="results-clamp" title={value}>
          {value}
        </span>
        {value.length > 40 && (
          <button
            className="results-text-button"
            onClick={(event) => openDetail(row, field, event.currentTarget)}
          >
            Read more
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <section className="results-records" aria-label="Submission records">
        <div className="results-toolbar">
          <div className="results-search">
            <Search size={17} />
            <input
              aria-label="Search records"
              value={globalSearch}
              onChange={(event) => {
                setPage(1)
                setGlobalSearch(event.target.value)
              }}
              placeholder="Search records…"
            />
          </div>
          <ResultsSelect
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </ResultsSelect>
          <ResultsSelect
            aria-label="Sort records"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as SortOption)
              setPage(1)
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="status_asc">Status A–Z</option>
            <option value="status_desc">Status Z–A</option>
          </ResultsSelect>
          <button
            className={`results-filter-button ${showAdvanced ? "is-active" : ""}`}
            aria-expanded={showAdvanced}
            aria-controls="results-filter-panel"
            onClick={() => setShowAdvanced((value) => !value)}
          >
            <SlidersHorizontal size={16} />
            Filters{chips.length > 0 && <span>{chips.length}</span>}
          </button>
        </div>
        {showAdvanced && (
          <div className="results-filter-panel" id="results-filter-panel">
            <div className="results-filter-heading">
              <strong>Refine records</strong>
              <span>Dates use London time</span>
            </div>
            <div className="results-filter-grid">
              <label>
                Submitted from
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value)
                    setPage(1)
                  }}
                />
              </label>
              <label>
                Submitted to
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => {
                    setToDate(event.target.value)
                    setPage(1)
                  }}
                />
              </label>
              {fields
                .filter((field) => !field.isSecure)
                .map((field) => (
                  <label key={field.key}>
                    {field.label}
                    <input
                      value={columnFilters[field.key] || ""}
                      onChange={(event) => updateColumnFilter(field.key, event.target.value)}
                      placeholder="Contains…"
                    />
                  </label>
                ))}
            </div>
            {fromDate && toDate && fromDate > toDate && (
              <p role="alert" className="results-date-error">
                The start date must be on or before the end date.
              </p>
            )}
            <p className="results-search-help">
              Search also supports <code>status:approved</code>, <code>date:2026-11</code> and{" "}
              <code>field-key:value</code>.
            </p>
          </div>
        )}
        {chips.length > 0 && (
          <div className="results-active-filters" aria-label="Active filters">
            {chips.map((chip) => (
              <button key={chip.key} onClick={chip.clear} aria-label={`Remove ${chip.label}`}>
                <span>{chip.label}</span>
                <X size={13} />
              </button>
            ))}
            <button className="results-clear" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}
        <div className="results-record-count" role="status">
          <strong>{sortedRows.length.toLocaleString("en-GB")}</strong>{" "}
          {hasActiveFilters ? `matching records of ${rows.length}` : "records"}
          <span className="results-record-actions">
            <span className="results-time-note">All times in London</span>
            <a className="results-insights-link" href="#insights-heading">
              View insights <ArrowDown size={13} aria-hidden="true" />
            </a>
          </span>
        </div>
        <div
          className="results-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable submission records"
        >
          <table className="results-table" style={{ minWidth: tableWidth }}>
            <caption className="sr-only">
              Submission records. Ranked choices show their first two preferences; use View all choices to
              inspect the full ranking.
            </caption>
            <colgroup>
              <col style={{ width: 195 }} />
              <col style={{ width: 115 }} />
              {fields.map((field) => (
                <col key={field.key} style={{ width: columnWidth(field) }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  scope="col"
                  aria-sort={sortBy === "newest" ? "descending" : sortBy === "oldest" ? "ascending" : "none"}
                >
                  <button
                    onClick={() => {
                      setSortBy(sortBy === "newest" ? "oldest" : "newest")
                      setPage(1)
                    }}
                  >
                    Submitted {sortBy === "oldest" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  </button>
                </th>
                <th scope="col">Status</th>
                {fields.map((field) => (
                  <th scope="col" key={field.key}>
                    <span>{field.label}</span>
                    {field.isSecure && (
                      <small>
                        <LockKeyhole size={11} />
                        Protected
                      </small>
                    )}
                    {field.isRanked && <small>Ranked preferences</small>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
                <tr key={row.id}>
                  <td className="results-submitted">
                    <span>{formatResultsDate(row.submittedAt, { year: "numeric" })}</span>
                    <small>
                      {formatResultsDate(row.submittedAt, {
                        day: undefined,
                        month: undefined,
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <span>#{row.number}</span>
                    </small>
                  </td>
                  <td>
                    <span
                      className={`results-status ${row.status === "approved" ? "is-approved" : row.status === "rejected" ? "is-rejected" : ""}`}
                    >
                      <i />
                      {row.status}
                    </span>
                  </td>
                  {fields.map((field) => (
                    <td key={field.key}>{renderCell(row, field)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {sortedRows.length === 0 && (
            <div className="results-empty">
              <Inbox size={30} />
              <strong>{rows.length ? "No matching records" : "No responses yet"}</strong>
              <p>
                {rows.length
                  ? "Try adjusting or clearing your filters."
                  : "Submitted responses will appear here."}
              </p>
              {hasActiveFilters && (
                <button className="results-text-button" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
        <div className="results-pagination">
          <div className="results-pagination-summary">
            <span>
              {sortedRows.length
                ? `${(page - 1) * pageSizeNumber + 1}–${Math.min(page * pageSizeNumber, sortedRows.length)} of ${sortedRows.length}`
                : "0 records"}
            </span>
            <a className="results-insights-link" href="#insights-heading">
              View insights <ArrowDown size={13} aria-hidden="true" />
            </a>
          </div>
          <label>
            Rows per page
            <ResultsSelect
              aria-label="Rows per page"
              value={pageSize}
              onChange={(event) => {
                setPageSize(event.target.value)
                setPage(1)
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size}>{size}</option>
              ))}
            </ResultsSelect>
          </label>
          <div>
            <button
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              aria-label="Next page"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
      <ResultsAnalytics
        fields={fields}
        rows={filteredRows}
        total={rows.length}
        capacity={capacity}
        now={now}
        filtered={hasActiveFilters}
      />
      <Sheet
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null)
        }}
      >
        <SheetContent
          className="results-detail-sheet w-full sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            detailTrigger.current?.focus()
          }}
        >
          <SheetHeader>
            <SheetTitle>{detail?.field.label}</SheetTitle>
            <SheetDescription>
              Record #{detail?.row.number} · {detail?.row.submittedLabel}
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="results-detail-body">
              <p className="results-detail-label">
                {detail.field.isRanked ? "Complete ranking · highest preference first" : "Complete answer"}
              </p>
              {detail.row.choices[detail.field.key] ? (
                detail.field.isRanked ? (
                  <ol className="results-ranking-full">
                    {detail.row.choices[detail.field.key].map((choice, i) => (
                      <li key={i}>
                        <span className="results-rank" aria-hidden="true">
                          {i + 1}
                        </span>
                        <span>{choice}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul className="results-selections-full">
                    {detail.row.choices[detail.field.key].map((choice, i) => (
                      <li key={i}>{choice}</li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="results-detail-text">{detail.row.values[detail.field.key]}</p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

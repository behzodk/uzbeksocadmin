"use client"

import { useEffect, useMemo, useState } from "react"
import type { FormFieldType } from "@/lib/types"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export interface PublicResultsField {
  id: string
  key: string
  label: string
  isSecure: boolean
  type: FormFieldType
}

export interface PublicResultsRow {
  id: string
  submittedAt: string
  submittedLabel: string
  status: string
  values: Record<string, string>
}

interface PublicResultsTableProps {
  fields: PublicResultsField[]
  rows: PublicResultsRow[]
}

type SortOption = "newest" | "oldest" | "status_asc" | "status_desc"

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"]
const isHttpUrl = (value: string) => value.startsWith("http://") || value.startsWith("https://")

export function PublicResultsTable({ fields, rows }: PublicResultsTableProps) {
  const [globalSearch, setGlobalSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [pageSize, setPageSize] = useState("25")
  const [page, setPage] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.status))).sort(), [rows])
  const fieldKeyLookup = useMemo(() => new Map(fields.map((field) => [field.key.toLowerCase(), field.key])), [fields])

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
      const submittedDate = row.submittedAt.slice(0, 10)
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

      const searchableParts = [row.submittedLabel, row.status, ...Object.values(row.values)].map((part) => part.toLowerCase())
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
            if (!submittedDate.includes(value) && !row.submittedLabel.toLowerCase().includes(value)) return false
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
      return cloned.sort((a, b) => a.status.localeCompare(b.status) || new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    }
    return cloned.sort((a, b) => b.status.localeCompare(a.status) || new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
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

  if (rows.length === 0) {
    return <div className="px-6 py-12 text-center text-sm text-muted-foreground">No responses yet.</div>
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalSearch}
              onChange={(event) => {
                setPage(1)
                setGlobalSearch(event.target.value)
              }}
              className="pl-9"
              placeholder='Search all columns or use tokens like "status:approved" or "email:gmail"'
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</label>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setPage(1)
              setStatusFilter(value)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sort</label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="status_asc">Status A to Z</SelectItem>
              <SelectItem value="status_desc">Status Z to A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Submitted From</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setPage(1)
              setFromDate(event.target.value)
            }}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Submitted To</label>
          <Input
            type="date"
            value={toDate}
            onChange={(event) => {
              setPage(1)
              setToDate(event.target.value)
            }}
          />
        </div>
        <div className="flex items-end gap-2 xl:col-span-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced((value) => !value)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showAdvanced ? "Hide column filters" : "Show column filters"}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Clear all filters
            </Button>
          )}
        </div>
      </div>

      {showAdvanced && (
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Column Filters</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {field.label}
                  {field.isSecure ? " (masked)" : ""}
                </label>
                <Input
                  value={columnFilters[field.key] || ""}
                  onChange={(event) => updateColumnFilter(field.key, event.target.value)}
                  placeholder={`Contains...`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{paginatedRows.length}</span> of{" "}
          <span className="font-medium text-foreground">{sortedRows.length}</span> matched rows
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page</span>
          <Select
            value={pageSize}
            onValueChange={(value) => {
              setPage(1)
              setPageSize(value)
            }}
          >
            <SelectTrigger className="h-8 w-[88px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/35">
            <tr className="border-b border-border/70 align-top">
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Submitted
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </th>
              {fields.map((field) => (
                <th
                  key={field.id}
                  className="min-w-[180px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  <div className="space-y-1">
                    <span>{field.label}</span>
                    {field.isSecure && (
                      <div className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground/90">
                        Masked publicly
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, index) => (
              <tr key={row.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                <td className="whitespace-nowrap border-b border-border/60 px-4 py-4 align-top font-medium text-foreground">
                  {row.submittedLabel}
                </td>
                <td className="border-b border-border/60 px-4 py-4 align-top">
                  <Badge variant="secondary" className="capitalize">
                    {row.status}
                  </Badge>
                </td>
                {fields.map((field) => (
                  <td
                    key={`${row.id}-${field.id}`}
                    className="min-w-[180px] max-w-[320px] border-b border-border/60 px-4 py-4 align-top text-foreground"
                  >
                    {field.type === "image" && !field.isSecure && row.values[field.key] && isHttpUrl(row.values[field.key]) ? (
                      <a
                        href={row.values[field.key]}
                        target="_blank"
                        rel="noreferrer"
                        className="block space-y-2 rounded-lg border border-border/70 p-2 hover:bg-muted/20"
                      >
                        <img
                          src={row.values[field.key]}
                          alt={`${field.label} submission`}
                          className="h-24 w-full rounded-md object-cover"
                        />
                        <span className="block text-xs font-medium text-primary">Open image</span>
                      </a>
                    ) : (
                      <div className="whitespace-normal break-words leading-6">{row.values[field.key] || "—"}</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedRows.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
          No results match your filters.
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

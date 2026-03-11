"use client"

import type React from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchKey?: keyof T
  itemsPerPage?: number
  onRowClick?: (item: T) => void
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchKey,
  itemsPerPage = 10,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(itemsPerPage)

  const filteredData = searchKey
    ? data.filter((item) => String(item[searchKey]).toLowerCase().includes(search.toLowerCase()))
    : data

  const totalPages = Math.ceil(filteredData.length / perPage)
  const startIndex = (currentPage - 1) * perPage
  const paginatedData = filteredData.slice(startIndex, startIndex + perPage)
  const rangeStart = filteredData.length === 0 ? 0 : startIndex + 1
  const rangeEnd = Math.min(startIndex + perPage, filteredData.length)
  const primaryColumn = columns[0]
  const actionColumn = columns.find((column) => String(column.key) === "actions")
  const detailColumns = columns.filter((column) => column !== primaryColumn && column !== actionColumn)

  const getColumnValue = (item: T, column: Column<T>) =>
    column.render ? column.render(item) : String(item[column.key as keyof T] ?? "")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[16rem] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={String(perPage)}
          onValueChange={(value) => {
            setPerPage(Number(value))
            setCurrentPage(1)
          }}
        >
          <SelectTrigger size="sm" className="w-32 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 per page</SelectItem>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="20">20 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border xl:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((column) => (
                <TableHead key={String(column.key)} className="font-semibold">
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                >
                  {columns.map((column) => (
                    <TableCell key={`${item.id}-${String(column.key)}`}>{getColumnValue(item, column)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 xl:hidden">
        {paginatedData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No results found
          </div>
        ) : (
          paginatedData.map((item) => (
            <div
              key={item.id}
              onClick={() => onRowClick?.(item)}
              onKeyDown={(event) => {
                if (!onRowClick) return
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onRowClick(item)
                }
              }}
              className={cn(
                "rounded-xl border border-border bg-card p-4 shadow-xs",
                onRowClick && "cursor-pointer transition-colors active:bg-muted/40",
              )}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  {primaryColumn && (
                    <div className="min-w-0 text-foreground [&_*]:max-w-full [&_*]:break-words [&_*]:whitespace-normal [&>div]:space-y-1 [&>div>p:first-child]:text-base [&>div>p:first-child]:font-semibold [&>p:first-child]:text-base [&>p:first-child]:font-semibold">
                      {getColumnValue(item, primaryColumn)}
                    </div>
                  )}
                </div>
                {actionColumn && (
                  <div className="shrink-0 rounded-lg bg-muted/45 p-1">
                    {getColumnValue(item, actionColumn)}
                  </div>
                )}
              </div>

              {detailColumns.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {detailColumns.map((column) => (
                    <div key={`${item.id}-${String(column.key)}`} className="rounded-lg bg-muted/45 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {column.header}
                      </p>
                      <div className="mt-1.5 text-sm font-medium text-foreground [&_*]:max-w-full [&_*]:break-words [&_*]:whitespace-normal">
                        {getColumnValue(item, column)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {rangeStart} to {rangeEnd} of {filteredData.length} results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

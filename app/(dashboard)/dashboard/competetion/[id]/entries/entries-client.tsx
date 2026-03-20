"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Competition, CompetitionEntry, CompetitionEntryRating } from "@/lib/types"
import {
  buildCompetitionLeaderboard,
  getMinimumRatingsRequiredForPlacement,
  normalizeLeaderboardSettings,
} from "@/lib/competition-scoring"
import { CompetitionImageUploadField } from "@/components/competition/competition-image-upload-field"
import { EntryRatingQrDialog } from "@/components/competition/entry-rating-qr-dialog"
import { useRoles } from "@/components/dashboard/role-provider"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { DataTable } from "@/components/dashboard/data-table"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { StatsCard } from "@/components/dashboard/stats-card"
import { StatusBadge, getStatusVariant } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ExternalLink, Pencil, Plus, Star, Trash2, Trophy, Users } from "lucide-react"

interface CompetitionEntriesClientProps {
  competition: Competition
  initialEntries: CompetitionEntry[]
  initialRatings: CompetitionEntryRating[]
}

function pluralize(label: string) {
  if (/(s|x|z|ch|sh)$/i.test(label)) return `${label}es`
  if (/[^aeiou]y$/i.test(label)) return `${label.slice(0, -1)}ies`
  return `${label}s`
}

function createEmptyEntryForm() {
  return {
    competitor_name: "",
    competitor_email: "",
    competitor_phone: "",
    entry_name: "",
    entry_description: "",
    entry_image: "",
    entry_image_path: "",
    status: "pending" as CompetitionEntry["status"],
  }
}

export function CompetitionEntriesClient({
  competition,
  initialEntries,
  initialRatings,
}: CompetitionEntriesClientProps) {
  const router = useRouter()
  const { roles, loading } = useRoles()
  const [entries, setEntries] = useState(initialEntries)
  const [ratings] = useState(initialRatings)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CompetitionEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<CompetitionEntry | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(createEmptyEntryForm())

  const canRead = roles.super_admin || roles.competitions?.read
  const canCreate = roles.super_admin || roles.competitions?.create
  const canUpdate = roles.super_admin || roles.competitions?.update
  const canDelete = roles.super_admin || roles.competitions?.delete

  useEffect(() => {
    if (!loading && !canRead) {
      router.push("/dashboard/competetion?error=unauthorized")
    }
  }, [canRead, loading, router])

  const leaderboardSettings = useMemo(
    () => normalizeLeaderboardSettings(competition.leaderboard_settings),
    [competition.leaderboard_settings],
  )
  const minimumRatingsToPlace = useMemo(
    () => getMinimumRatingsRequiredForPlacement(competition.leaderboard_settings),
    [competition.leaderboard_settings],
  )

  const ratingSummary = useMemo(() => {
    const leaderboardRows = buildCompetitionLeaderboard(competition, entries, ratings)
    return new Map(
      leaderboardRows.map((row) => [
        row.entry.id,
        {
          count: row.ratingsCount,
          average: row.displayScore,
          isEligibleForPlacement: row.isEligibleForPlacement,
          ratingsNeededForPlacement: row.ratingsNeededForPlacement,
        },
      ]),
    )
  }, [competition, entries, ratings])

  const approvedCount = entries.filter((entry) => entry.status === "approved").length
  const pendingCount = entries.filter((entry) => entry.status === "pending").length
  const totalRatings = ratings.length
  const entryLabel = competition.entry_label || "Entry"
  const entryLabelPlural = pluralize(entryLabel)
  const entryLabelLower = entryLabel.toLowerCase()

  const openCreateDialog = () => {
    setEditingEntry(null)
    setFormData(createEmptyEntryForm())
    setIsDialogOpen(true)
  }

  const openEditDialog = (entry: CompetitionEntry) => {
    setEditingEntry(entry)
    setFormData({
      competitor_name: entry.competitor_name,
      competitor_email: entry.competitor_email || "",
      competitor_phone: entry.competitor_phone || "",
      entry_name: entry.entry_name,
      entry_description: entry.entry_description || "",
      entry_image: entry.entry_image || "",
      entry_image_path: entry.entry_image_path || "",
      status: entry.status,
    })
    setIsDialogOpen(true)
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    const supabase = getSupabaseBrowserClient()

    const payload = {
      competition_id: competition.id,
      competitor_name: formData.competitor_name,
      competitor_email: formData.competitor_email || null,
      competitor_phone: formData.competitor_phone || null,
      entry_name: formData.entry_name,
      entry_description: formData.entry_description || null,
      entry_image: formData.entry_image || null,
      entry_image_path: formData.entry_image_path || null,
      status: formData.status,
    }

    if (editingEntry) {
      const { data } = await supabase
        .from("competition_entries")
        .update(payload)
        .eq("id", editingEntry.id)
        .select()
        .single()

      if (data) {
        setEntries((prev) => prev.map((entry) => (entry.id === editingEntry.id ? data : entry)))
      }
    } else {
      const { data } = await supabase.from("competition_entries").insert(payload).select().single()

      if (data) {
        setEntries((prev) => [data, ...prev])
      }
    }

    setIsSaving(false)
    setIsDialogOpen(false)
    setEditingEntry(null)
    setFormData(createEmptyEntryForm())
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deletingEntry) return

    setIsSaving(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from("competition_entries").delete().eq("id", deletingEntry.id)

    if (!error) {
      setEntries((prev) => prev.filter((entry) => entry.id !== deletingEntry.id))
    }

    setDeletingEntry(null)
    setIsSaving(false)
    router.refresh()
  }

  const columns = [
    {
      key: "entry_name",
      header: competition.entry_label || "Entry",
      render: (entry: CompetitionEntry) => (
        <div>
          <p className="font-medium">{entry.entry_name}</p>
          <p className="text-xs text-muted-foreground">
            {entry.competitor_name}
            {entry.competitor_email ? ` • ${entry.competitor_email}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "rating_public_id",
      header: "Rating ID",
      render: (entry: CompetitionEntry) => (
        <span className="font-mono text-xs text-muted-foreground">{entry.rating_public_id}</span>
      ),
    },
    {
      key: "ratings",
      header: "Ratings",
      render: (entry: CompetitionEntry) => {
        const summary = ratingSummary.get(entry.id)
        return (
          <span className="text-sm">
            {summary?.count || 0} ratings
            {summary && summary.count > 0
              ? ` • ${summary.average.toFixed(1)} / ${leaderboardSettings.result_max}`
              : ""}
            {summary && !summary.isEligibleForPlacement
              ? ` • needs ${summary.ratingsNeededForPlacement || minimumRatingsToPlace} more to place`
              : ""}
          </span>
        )
      },
    },
    {
      key: "status",
      header: "Status",
      render: (entry: CompetitionEntry) => (
        <StatusBadge status={entry.status} variant={getStatusVariant(entry.status)} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (entry: CompetitionEntry) => (
        <div className="flex items-center gap-1">
          {entry.status === "approved" && (
            <>
              <EntryRatingQrDialog entryName={entry.entry_name} ratingPublicId={entry.rating_public_id} />
              <Button
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation()
                  window.open(`/competitions/rate/${entry.rating_public_id}`, "_blank")
                }}
                title="Open public rating page"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          )}
          {canUpdate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation()
                openEditDialog(entry)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation()
                setDeletingEntry(entry)
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/competetion">
            <Button variant="ghost" className="mb-3 -ml-2 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Competetions
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{competition.title} Entries</h1>
          <p className="mt-1 text-muted-foreground">
            Manage registered {entryLabelLower} submissions and guest rating links.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/competetion/${competition.id}/edit`)}>
            Edit Competetion
          </Button>
          {competition.slug && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/competitions/${competition.slug}/leaderboard`, "_blank")}>
              View Leaderboard
            </Button>
          )}
          {canCreate && (
            <Button onClick={openCreateDialog} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add {entryLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Total Entries" value={entries.length} icon={Trophy} />
        <StatsCard title="Approved" value={approvedCount} icon={Users} />
        <StatsCard title="Pending" value={pendingCount} icon={Users} />
        <StatsCard title="Ratings" value={totalRatings} icon={Star} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All {entryLabelPlural}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={entries}
            columns={columns}
            searchPlaceholder={`Search ${entryLabelPlural.toLowerCase()}...`}
            searchKey="entry_name"
            onRowClick={canUpdate ? openEditDialog : undefined}
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEntry ? `Edit ${entryLabel}` : `Add ${entryLabel}`}</DialogTitle>
            <DialogDescription>
              Capture the competitor details and generate a public rating ID for guests.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entry_name">{entryLabel} Name</Label>
                <Input
                  id="entry_name"
                  value={formData.entry_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, entry_name: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitor_name">Competitor Name</Label>
                <Input
                  id="competitor_name"
                  value={formData.competitor_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, competitor_name: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="competitor_email">Competitor Email</Label>
                <Input
                  id="competitor_email"
                  type="email"
                  value={formData.competitor_email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, competitor_email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitor_phone">Competitor Phone</Label>
                <Input
                  id="competitor_phone"
                  value={formData.competitor_phone}
                  onChange={(event) => setFormData((prev) => ({ ...prev, competitor_phone: event.target.value }))}
                />
              </div>
            </div>

            <CompetitionImageUploadField
              id="entry_image"
              label={`${entryLabel} Image`}
              imageUrl={formData.entry_image}
              storagePath={formData.entry_image_path}
              folder="entries/admin"
              hint="Upload an image from this device. The stored public URL will be saved to the entry."
              onChange={({ imageUrl, storagePath }) =>
                setFormData((prev) => ({
                  ...prev,
                  entry_image: imageUrl,
                  entry_image_path: storagePath,
                }))
              }
              onClear={() =>
                setFormData((prev) => ({
                  ...prev,
                  entry_image: "",
                  entry_image_path: "",
                }))
              }
            />

            <div className="space-y-2">
              <Label htmlFor="entry_description">Description</Label>
              <Textarea
                id="entry_description"
                value={formData.entry_description}
                onChange={(event) => setFormData((prev) => ({ ...prev, entry_description: event.target.value }))}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as CompetitionEntry["status"] }))}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingEntry ? "Update Entry" : "Create Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingEntry}
        onOpenChange={(open) => !open && setDeletingEntry(null)}
        title={`Delete ${entryLabel}`}
        description={`Are you sure you want to delete "${deletingEntry?.entry_name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  )
}

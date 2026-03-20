"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Competition } from "@/lib/types"
import { DataTable } from "@/components/dashboard/data-table"
import { StatusBadge, getStatusVariant } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { StatsCard } from "@/components/dashboard/stats-card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRoles } from "@/components/dashboard/role-provider"
import { Trophy, Plus, Pencil, Trash2, CalendarDays, ListChecks } from "lucide-react"

interface CompetitionsClientProps {
  initialCompetitions: Competition[]
}

export function CompetitionsClient({ initialCompetitions }: CompetitionsClientProps) {
  const [competitions, setCompetitions] = useState<Competition[]>(initialCompetitions)
  const [deletingCompetition, setDeletingCompetition] = useState<Competition | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { roles, loading } = useRoles()

  const canRead = roles.super_admin || roles.competitions?.read
  const canCreate = roles.super_admin || roles.competitions?.create
  const canUpdate = roles.super_admin || roles.competitions?.update
  const canDelete = roles.super_admin || roles.competitions?.delete

  useEffect(() => {
    if (!loading && !canRead) {
      router.push("/dashboard?error=unauthorized")
    }
  }, [canRead, loading, router])

  const publishedCompetitions = competitions.filter((competition) => competition.status === "published").length
  const draftCompetitions = competitions.filter((competition) => competition.status === "draft").length
  const upcomingCompetitions = competitions.filter(
    (competition) => competition.status === "published" && new Date(competition.start_date) > new Date(),
  ).length

  const handleCreate = () => {
    router.push("/dashboard/competetion/new/edit")
  }

  const handleEdit = (competition: Competition) => {
    router.push(`/dashboard/competetion/${competition.id}/edit`)
  }

  const handleManageEntries = (competition: Competition) => {
    router.push(`/dashboard/competetion/${competition.id}/entries`)
  }

  const handleDelete = async () => {
    if (!deletingCompetition) return

    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from("competitions").delete().eq("id", deletingCompetition.id)

    if (!error) {
      setCompetitions((prev) => prev.filter((competition) => competition.id !== deletingCompetition.id))
    }

    setDeletingCompetition(null)
    setIsLoading(false)
    router.refresh()
  }

  const columns = [
    {
      key: "title",
      header: "Competetion",
      render: (competition: Competition) => (
        <div>
          <p className="font-medium">{competition.title}</p>
          <p className="max-w-[240px] truncate text-xs text-muted-foreground">
            {competition.slug ? `/competitions/${competition.slug}` : "No slug set"}
          </p>
        </div>
      ),
    },
    {
      key: "start_date",
      header: "Start",
      render: (competition: Competition) => (
        <span className="text-sm">
          {new Date(competition.start_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "registration_deadline",
      header: "Deadline",
      render: (competition: Competition) => (
        <span className="text-sm">
          {competition.registration_deadline
            ? new Date(competition.registration_deadline).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Open"}
        </span>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      render: (competition: Competition) => <span className="text-sm">{competition.capacity || "Unlimited"}</span>,
    },
    {
      key: "entry_label",
      header: "Entry Type",
      render: (competition: Competition) => <span className="text-sm">{competition.entry_label || "Entry"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (competition: Competition) => (
        <StatusBadge status={competition.status} variant={getStatusVariant(competition.status)} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (competition: Competition) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation()
              handleManageEntries(competition)
            }}
            title="Manage entries"
          >
            <ListChecks className="h-4 w-4" />
          </Button>
          {canUpdate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation()
                handleEdit(competition)
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
                setDeletingCompetition(competition)
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
          <h1 className="text-2xl font-bold text-foreground">Competetion Management</h1>
          <p className="mt-1 text-muted-foreground">Create and manage your organization&apos;s competitions</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate} size="sm" className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Create Competetion
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Total Competetions" value={competitions.length} icon={Trophy} />
        <StatsCard title="Published" value={publishedCompetitions} icon={Trophy} />
        <StatsCard title="Upcoming" value={upcomingCompetitions} icon={CalendarDays} />
        <StatsCard title="Drafts" value={draftCompetitions} icon={Trophy} />
      </div>

      <DataTable
        data={competitions}
        columns={columns}
        searchPlaceholder="Search competetions..."
        searchKey="title"
        onRowClick={canUpdate ? handleEdit : undefined}
      />

      <ConfirmDialog
        open={!!deletingCompetition}
        onOpenChange={(open) => !open && setDeletingCompetition(null)}
        title="Delete Competetion"
        description={`Are you sure you want to delete "${deletingCompetition?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  )
}

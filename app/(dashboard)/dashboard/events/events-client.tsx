"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Event } from "@/lib/types"
import { DataTable } from "@/components/dashboard/data-table"
import { StatusBadge, getStatusVariant } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Calendar, ExternalLink } from "lucide-react"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { StatsCard } from "@/components/dashboard/stats-card"

interface EventsClientProps {
  initialEvents: Event[]
}

export function EventsClient({ initialEvents }: EventsClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const upcomingEvents = events.filter((e) => e.status === "published" && new Date(e.start_date) > new Date()).length
  const draftEvents = events.filter((e) => e.status === "draft").length

  const handleCreate = () => {
    router.push("/dashboard/events/new/edit")
  }

  const handleEdit = (event: Event) => {
    router.push(`/dashboard/events/${event.id}/edit`)
  }

  const handleDelete = async () => {
    if (!deletingEvent) return

    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()

    const { error } = await supabase.from("events").delete().eq("id", deletingEvent.id)

    if (!error) {
      setEvents((prev) => prev.filter((e) => e.id !== deletingEvent.id))
    }

    setIsLoading(false)
    setDeletingEvent(null)
    router.refresh()
  }

  const columns = [
    {
      key: "title",
      header: "Event",
      render: (event: Event) => (
        <div>
          <p className="font-medium">{event.title}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
            {event.slug ? `/events/${event.slug}` : "No slug set"}
          </p>
        </div>
      ),
    },
    {
      key: "start_date",
      header: "Date",
      render: (event: Event) => (
        <span className="text-sm">
          {new Date(event.start_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      render: (event: Event) => <span className="text-sm">{event.capacity || "Unlimited"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (event: Event) => <StatusBadge status={event.status} variant={getStatusVariant(event.status)} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (event: Event) => (
        <div className="flex items-center gap-1">
          {event.slug && event.status === "published" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                window.open(`/events/${event.slug}`, "_blank")
              }}
              title="View public page"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(event)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingEvent(event)
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage your organization&apos;s events</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Total Events" value={events.length} icon={Calendar} />
        <StatsCard title="Upcoming" value={upcomingEvents} icon={Calendar} />
        <StatsCard title="Drafts" value={draftEvents} icon={Calendar} />
      </div>

      <DataTable data={events} columns={columns} searchPlaceholder="Search events..." searchKey="title" />

      <ConfirmDialog
        open={!!deletingEvent}
        onOpenChange={(open) => !open && setDeletingEvent(null)}
        title="Delete Event"
        description={`Are you sure you want to delete "${deletingEvent?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  )
}

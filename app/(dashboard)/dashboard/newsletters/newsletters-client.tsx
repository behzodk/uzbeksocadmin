"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Newsletter } from "@/lib/types"
import { DataTable } from "@/components/dashboard/data-table"
import { StatusBadge, getStatusVariant } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Mail, Send, ExternalLink } from "lucide-react"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { StatsCard } from "@/components/dashboard/stats-card"

interface NewslettersClientProps {
  initialNewsletters: Newsletter[]
}

export function NewslettersClient({ initialNewsletters }: NewslettersClientProps) {
  const [newsletters, setNewsletters] = useState<Newsletter[]>(initialNewsletters)
  const [deletingNewsletter, setDeletingNewsletter] = useState<Newsletter | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const sentNewsletters = newsletters.filter((n) => n.status === "sent").length
  const draftNewsletters = newsletters.filter((n) => n.status === "draft").length
  const scheduledNewsletters = newsletters.filter((n) => n.status === "scheduled").length

  const handleCreate = () => {
    router.push("/dashboard/newsletters/new/edit")
  }

  const handleEdit = (newsletter: Newsletter) => {
    router.push(`/dashboard/newsletters/${newsletter.id}/edit`)
  }

  const handleDelete = async () => {
    if (!deletingNewsletter) return

    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()

    const { error } = await supabase.from("newsletters").delete().eq("id", deletingNewsletter.id)

    if (!error) {
      setNewsletters((prev) => prev.filter((n) => n.id !== deletingNewsletter.id))
    }

    setIsLoading(false)
    setDeletingNewsletter(null)
    router.refresh()
  }

  const columns = [
    {
      key: "subject",
      header: "Subject",
      render: (newsletter: Newsletter) => (
        <div>
          <p className="font-medium">{newsletter.subject}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[250px]">
            {newsletter.slug ? `/newsletters/${newsletter.slug}` : "No slug set"}
          </p>
        </div>
      ),
    },
    {
      key: "recipient_count",
      header: "Recipients",
      render: (newsletter: Newsletter) => <span className="text-sm">{newsletter.recipient_count}</span>,
    },
    {
      key: "open_rate",
      header: "Open Rate",
      render: (newsletter: Newsletter) => (
        <span className="text-sm">{newsletter.open_rate ? `${newsletter.open_rate}%` : "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (newsletter: Newsletter) => (
        <StatusBadge status={newsletter.status} variant={getStatusVariant(newsletter.status)} />
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (newsletter: Newsletter) => (
        <span className="text-sm">
          {new Date(newsletter.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (newsletter: Newsletter) => (
        <div className="flex items-center gap-1">
          {newsletter.slug && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                window.open(`/newsletters/${newsletter.slug}`, "_blank")
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
              handleEdit(newsletter)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingNewsletter(newsletter)
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
          <h1 className="text-2xl font-bold text-foreground">Newsletter Management</h1>
          <p className="text-muted-foreground mt-1">Create, schedule, and track your newsletters</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Newsletter
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Total" value={newsletters.length} icon={Mail} />
        <StatsCard title="Sent" value={sentNewsletters} icon={Send} />
        <StatsCard title="Scheduled" value={scheduledNewsletters} icon={Mail} />
        <StatsCard title="Drafts" value={draftNewsletters} icon={Mail} />
      </div>

      <DataTable data={newsletters} columns={columns} searchPlaceholder="Search newsletters..." searchKey="subject" />

      <ConfirmDialog
        open={!!deletingNewsletter}
        onOpenChange={(open) => !open && setDeletingNewsletter(null)}
        title="Delete Newsletter"
        description={`Are you sure you want to delete "${deletingNewsletter?.subject}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  )
}

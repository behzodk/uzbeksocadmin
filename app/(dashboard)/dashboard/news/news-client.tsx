"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { News } from "@/lib/types"
import { DataTable } from "@/components/dashboard/data-table"
import { StatusBadge, getStatusVariant } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Mail, Send, ExternalLink } from "lucide-react"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { StatsCard } from "@/components/dashboard/stats-card"
import { useRoles } from "@/components/dashboard/role-provider"

interface NewsClientProps {
  initialNews: News[]
}

export function NewsClient({ initialNews }: NewsClientProps) {
  const [news, setNews] = useState<News[]>(initialNews)
  const [deletingNews, setDeletingNews] = useState<News | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { roles } = useRoles()

  const sentNews = news.filter((n) => n.status === "published").length
  const draftNews = news.filter((n) => n.status === "draft").length
  const scheduledNews = news.filter((n) => n.status === "scheduled").length

  const handleCreate = () => {
    router.push("/dashboard/news/new/edit")
  }

  const handleEdit = (news: News) => {
    router.push(`/dashboard/news/${news.id}/edit`)
  }

  const handleDelete = async () => {
    if (!deletingNews) return

    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()

    const { error } = await supabase.from("news").delete().eq("id", deletingNews.id)

    if (!error) {
      setNews((prev) => prev.filter((n) => n.id !== deletingNews.id))
    }

    setIsLoading(false)
    setDeletingNews(null)
    router.refresh()
  }

  const columns = [
    {
      key: "subject",
      header: "Title",
      render: (news: News) => (
        <div>
          <p className="font-medium">{news.subject}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[250px]">
            {news.slug ? `/news/${news.slug}` : "No slug set"}
          </p>
        </div>
      ),
    },
    {
      key: "recipient_count",
      header: "Recipients",
      render: (news: News) => <span className="text-sm">{news.recipient_count}</span>,
    },
    {
      key: "open_rate",
      header: "Open Rate",
      render: (news: News) => (
        <span className="text-sm">{news.open_rate ? `${news.open_rate}%` : "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (news: News) => (
        <StatusBadge status={news.status} variant={getStatusVariant(news.status)} />
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (news: News) => (
        <span className="text-sm">
          {new Date(news.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (news: News) => (
        <div className="flex items-center gap-1">
          {news.slug && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                window.open(`/news/${news.slug}`, "_blank")
              }}
              title="View public page"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {(roles.super_admin || roles.news?.update) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handleEdit(news)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {(roles.super_admin || roles.news?.delete) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                setDeletingNews(news)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">News Management</h1>
          <p className="text-muted-foreground mt-1">Create, schedule, and track your news</p>
        </div>
        {(roles.super_admin || roles.news?.create) && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create News
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Total" value={news.length} icon={Mail} />
        <StatsCard title="Published" value={sentNews} icon={Send} />
        <StatsCard title="Scheduled" value={scheduledNews} icon={Mail} />
        <StatsCard title="Drafts" value={draftNews} icon={Mail} />
      </div>

      <DataTable data={news} columns={columns} searchPlaceholder="Search news..." searchKey="subject" />

      <ConfirmDialog
        open={!!deletingNews}
        onOpenChange={(open) => !open && setDeletingNews(null)}
        title="Delete News"
        description={`Are you sure you want to delete "${deletingNews?.subject}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  )
}

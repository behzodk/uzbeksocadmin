"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Form } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { DataTable } from "@/components/dashboard/data-table"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus, Trash2, Pencil, Inbox } from "lucide-react"

interface FormsClientProps {
  initialForms: Form[]
}

export function FormsClient({ initialForms }: FormsClientProps) {
  const router = useRouter()
  const [forms, setForms] = useState<Form[]>(initialForms)
  const [deletingForm, setDeletingForm] = useState<Form | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const activeCount = useMemo(() => forms.filter((form) => form.is_active).length, [forms])
  const linkedCount = useMemo(() => forms.filter((form) => form.event_id).length, [forms])

  const handleCreate = () => {
    router.push("/dashboard/forms/new/edit")
  }

  const handleEdit = (form: Form) => {
    router.push(`/dashboard/forms/${form.id}/edit`)
  }

  const handleDelete = async () => {
    if (!deletingForm) return

    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from("forms").delete().eq("id", deletingForm.id)

    if (!error) {
      setForms((prev) => prev.filter((form) => form.id !== deletingForm.id))
    }

    setIsLoading(false)
    setDeletingForm(null)
    router.refresh()
  }

  const columns = [
    {
      key: "title",
      header: "Form",
      render: (form: Form) => (
        <div>
          <p className="font-medium">{form.title}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[250px]">/{form.slug}</p>
        </div>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (form: Form) => (
        <span className={`text-xs font-semibold ${form.is_active ? "text-emerald-600" : "text-muted-foreground"}`}>
          {form.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "schema",
      header: "Fields",
      render: (form: Form) => <span className="text-sm">{form.schema?.fields?.length || 0}</span>,
    },
    {
      key: "created_at",
      header: "Created",
      render: (form: Form) => (
        <span className="text-sm">
          {new Date(form.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (form: Form) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/dashboard/forms/${form.id}/responses`)
            }}
            title="View responses"
          >
            <Inbox className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(form)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingForm(form)
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
          <h1 className="text-2xl font-bold text-foreground">Forms Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage registration forms</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create a Form
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Total Forms" value={forms.length} icon={FileText} />
        <StatsCard title="Active" value={activeCount} icon={FileText} />
        <StatsCard title="Linked Events" value={linkedCount} icon={FileText} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Forms</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={forms}
            columns={columns}
            searchPlaceholder="Search forms..."
            searchKey="title"
            onRowClick={handleEdit}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deletingForm}
        onOpenChange={(open) => !open && setDeletingForm(null)}
        title="Delete Form"
        description={`Are you sure you want to delete "${deletingForm?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  )
}

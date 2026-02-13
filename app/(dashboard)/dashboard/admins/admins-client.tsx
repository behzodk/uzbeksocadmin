"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { createAdmin, updateAdmin, deleteAdmin, type Admin } from "@/actions/admins"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface AdminsClientProps {
    initialAdmins: Admin[]
}

const DEFAULT_ROLES = {
    super_admin: false,
    form_access: false,
    news_access: false,
    events_access: false,
}

export function AdminsClient({ initialAdmins }: AdminsClientProps) {
    const router = useRouter()
    // Since we use revalidatePath, we can rely on router.refresh() to update the data passed from the server page.
    // However, for immediate feedback and optimistic updates, we could manage state locally too.
    // Given the plan, let's trust the server data pass-through for now, or just use state initialized with server data and updated via router.refresh
    // Actually, standard Next.js pattern is to refresh route.

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
    const [deletingAdmin, setDeletingAdmin] = useState<Admin | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Form state
    const [email, setEmail] = useState("")
    const [roles, setRoles] = useState<Admin["roles"]>(DEFAULT_ROLES)

    const resetForm = () => {
        setEmail("")
        setRoles(DEFAULT_ROLES)
        setEditingAdmin(null)
    }

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open)
        if (!open) resetForm()
    }

    const handleEditClick = (admin: Admin) => {
        setEditingAdmin(admin)
        setEmail(admin.email)
        setRoles(admin.roles)
        setIsDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (editingAdmin) {
                await updateAdmin(editingAdmin.id, roles)
                toast.success("Admin updated successfully")
            } else {
                await createAdmin(email, roles)
                toast.success("Admin created successfully")
            }
            setIsDialogOpen(false)
            resetForm()
            router.refresh()
        } catch (error) {
            toast.error(editingAdmin ? "Failed to update admin" : "Failed to create admin")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingAdmin) return
        setIsLoading(true)

        try {
            await deleteAdmin(deletingAdmin.id)
            toast.success("Admin deleted successfully")
            setDeletingAdmin(null)
            router.refresh()
        } catch (error) {
            toast.error("Failed to delete admin")
        } finally {
            setIsLoading(false)
        }
    }

    const columns = [
        {
            key: "email",
            header: "Email",
            render: (admin: Admin) => <span className="font-medium">{admin.email}</span>,
        },
        {
            key: "roles",
            header: "Roles",
            render: (admin: Admin) => (
                <div className="flex flex-wrap gap-1">
                    {admin.roles.super_admin && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">
                            Super Admin
                        </span>
                    )}
                    {admin.roles.form_access && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                            Forms
                        </span>
                    )}
                    {admin.roles.news_access && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
                            News
                        </span>
                    )}
                    {admin.roles.events_access && (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full dark:bg-purple-900/30 dark:text-purple-400">
                            Events
                        </span>
                    )}
                    {!Object.values(admin.roles).some(Boolean) && (
                        <span className="text-muted-foreground text-xs italic">No access</span>
                    )}
                </div>
            ),
        },
        {
            key: "created_at",
            header: "Created",
            render: (admin: Admin) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(admin.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: "actions",
            header: "Actions",
            render: (admin: Admin) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(admin)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingAdmin(admin)}>
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
                    <h1 className="text-2xl font-bold text-foreground">Admins Management</h1>
                    <p className="text-muted-foreground mt-1">Manage admin access and permissions</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Admin
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAdmin ? "Edit Admin" : "Add Admin"}</DialogTitle>
                        <DialogDescription>
                            {editingAdmin
                                ? "Update roles for this administrator."
                                : "Add a new administrator. They will need to sign in with this email."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={!!editingAdmin}
                                required
                                placeholder="admin@example.com"
                            />
                            {editingAdmin && <p className="text-xs text-muted-foreground">Email cannot be changed.</p>}
                        </div>

                        <div className="space-y-3 border rounded-md p-4">
                            <Label>Permissions</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="super_admin"
                                        checked={roles.super_admin}
                                        onCheckedChange={(checked) => setRoles(prev => ({ ...prev, super_admin: !!checked }))}
                                    />
                                    <Label htmlFor="super_admin" className="font-normal cursor-pointer">Super Admin</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="form_access"
                                        checked={roles.form_access}
                                        onCheckedChange={(checked) => setRoles(prev => ({ ...prev, form_access: !!checked }))}
                                    />
                                    <Label htmlFor="form_access" className="font-normal cursor-pointer">Form Access</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="news_access"
                                        checked={roles.news_access}
                                        onCheckedChange={(checked) => setRoles(prev => ({ ...prev, news_access: !!checked }))}
                                    />
                                    <Label htmlFor="news_access" className="font-normal cursor-pointer">News Access</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="events_access"
                                        checked={roles.events_access}
                                        onCheckedChange={(checked) => setRoles(prev => ({ ...prev, events_access: !!checked }))}
                                    />
                                    <Label htmlFor="events_access" className="font-normal cursor-pointer">Events Access</Label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : editingAdmin ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deletingAdmin}
                onOpenChange={(open) => !open && setDeletingAdmin(null)}
                title="Delete Admin"
                description={`Are you sure you want to delete "${deletingAdmin?.email}"? This action cannot be undone.`}
                onConfirm={handleDelete}
                confirmText="Delete"
                variant="destructive"
            />

            <DataTable
                data={initialAdmins}
                columns={columns}
                searchPlaceholder="Search admins..."
                searchKey="email"
            />
        </div>
    )
}

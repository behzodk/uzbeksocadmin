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
import { Plus, Pencil, Trash2, FolderOpen, Folder, ChevronRight, ChevronDown, Check, FileText, CornerDownRight, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface AdminsClientProps {
    initialAdmins: Admin[]
}

const DEFAULT_PERMISSIONS = {
    read: false,
    create: false,
    update: false,
    delete: false,
}

const DEFAULT_ROLES = {
    super_admin: false,
    forms: { ...DEFAULT_PERMISSIONS },
    news: { ...DEFAULT_PERMISSIONS },
    events: { ...DEFAULT_PERMISSIONS },
}

const RESOURCES = [
    { key: "forms", label: "Forms" },
    { key: "news", label: "News" },
    { key: "events", label: "Events" },
] as const

export function AdminsClient({ initialAdmins }: AdminsClientProps) {
    const router = useRouter()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
    const [deletingAdmin, setDeletingAdmin] = useState<Admin | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Form state
    const [email, setEmail] = useState("")
    const [roles, setRoles] = useState<Admin["roles"]>(DEFAULT_ROLES)

    const resetForm = () => {
        setEmail("")
        setRoles(JSON.parse(JSON.stringify(DEFAULT_ROLES))) // Deep copy to avoid reference issues
        setEditingAdmin(null)
    }

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open)
        if (!open) resetForm()
    }

    const handleEditClick = (admin: Admin) => {
        setEditingAdmin(admin)
        setEmail(admin.email)
        // Ensure defaults for missing keys if migration is partial
        const mergedRoles = {
            ...DEFAULT_ROLES,
            ...admin.roles,
            forms: { ...DEFAULT_ROLES.forms, ...admin.roles.forms },
            news: { ...DEFAULT_ROLES.news, ...admin.roles.news },
            events: { ...DEFAULT_ROLES.events, ...admin.roles.events },
        }
        setRoles(mergedRoles)
        setIsDialogOpen(true)
    }

    const handlePermissionChange = (resource: "forms" | "news" | "events", action: keyof typeof DEFAULT_PERMISSIONS, checked: boolean) => {
        setRoles((prev) => {
            const newRoles = { ...prev }
            const resourceRoles = { ...newRoles[resource] }

            resourceRoles[action] = checked

            // Logic: Read must be enabled automatically to enable other actions
            if (action !== "read" && checked) {
                resourceRoles.read = true
            }

            // Logic: Deselecting Read auto-deselects others
            if (action === "read" && !checked) {
                resourceRoles.create = false
                resourceRoles.update = false
                resourceRoles.delete = false
            }

            newRoles[resource] = resourceRoles
            return newRoles
        })
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
            render: (admin: Admin) => {
                if (admin.roles.super_admin) {
                    return (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">
                            Super Admin
                        </span>
                    )
                }

                // Helper to check if any permission exists for a resource
                const hasAccess = (resource: "forms" | "news" | "events") => {
                    return admin.roles[resource] && Object.values(admin.roles[resource]).some(Boolean)
                }

                const activeResources = RESOURCES.filter(r => hasAccess(r.key))

                if (activeResources.length === 0) {
                    return <span className="text-muted-foreground text-xs italic">No access</span>
                }

                return (
                    <div className="flex flex-wrap gap-1">
                        {activeResources.map(r => (
                            <span key={r.key} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full capitalize">
                                {r.label}
                            </span>
                        ))}
                    </div>
                )
            },
        },
        {
            key: "created_at",
            header: "Created",
            render: (admin: Admin) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(admin.created_at).toLocaleDateString("en-US")}
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
                <DialogContent className="max-w-2xl">
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
                            <Label className="text-base">Permissions</Label>
                            <div className="flex items-center space-x-2 mb-4">
                                <Checkbox
                                    id="super_admin"
                                    checked={roles.super_admin}
                                    onCheckedChange={(checked) => setRoles(prev => ({ ...prev, super_admin: !!checked }))}
                                />
                                <Label htmlFor="super_admin" className="font-normal cursor-pointer text-sm">Super Admin (Full Access)</Label>
                            </div>

                            <div className="border rounded-lg bg-card overflow-hidden">
                                <div className="bg-muted/50 p-2 flex items-center gap-2 border-b">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-semibold">Access Control List</span>
                                </div>
                                <div className="p-2 space-y-1">
                                    {RESOURCES.map((resource) => (
                                        <Collapsible key={resource.key} defaultOpen className="group">
                                            <CollapsibleTrigger className="flex items-center w-full p-2 rounded-md hover:bg-muted/50 text-left transition-colors [&[data-state=open]>svg:first-child]:rotate-90">
                                                <ChevronRight className="h-4 w-4 text-muted-foreground mr-1 transition-transform" />
                                                <div className="flex items-center gap-2">
                                                    <Folder className="h-4 w-4 fill-primary/20 text-primary group-data-[state=open]:hidden" />
                                                    <FolderOpen className="h-4 w-4 fill-primary/20 text-primary hidden group-data-[state=open]:block" />
                                                    <span className="text-sm font-medium">{resource.label}</span>
                                                </div>
                                            </CollapsibleTrigger>

                                            <CollapsibleContent className="pl-9 pr-2 py-1 space-y-1">
                                                {["read", "create", "update", "delete"].map((action) => (
                                                    <div key={action} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 ml-1 border-l-2 border-muted border-l-transparent hover:border-l-primary/50 pl-2 transition-all">
                                                        {/* Tree line connector visual */}
                                                        <div className="relative flex items-center justify-center w-4 h-4 mr-1">
                                                            <CornerDownRight className="h-3 w-3 text-muted-foreground/40 absolute -left-4 -top-3" />
                                                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </div>

                                                        <div className="flex items-center space-x-2 flex-1">
                                                            <Checkbox
                                                                id={`${resource.key}-${action}`}
                                                                checked={roles[resource.key]?.[action as keyof typeof DEFAULT_PERMISSIONS]}
                                                                onCheckedChange={(checked) =>
                                                                    handlePermissionChange(resource.key as any, action as any, !!checked)
                                                                }
                                                                disabled={roles.super_admin}
                                                                className="h-4 w-4"
                                                            />
                                                            <Label
                                                                htmlFor={`${resource.key}-${action}`}
                                                                className="font-normal cursor-pointer capitalize text-sm flex-1 select-none"
                                                            >
                                                                {action} access
                                                            </Label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ))}
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

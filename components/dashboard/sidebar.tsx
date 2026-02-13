"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Calendar, Mail, FileText, ChevronLeft, ChevronRight, Shield } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRoles } from "@/components/dashboard/role-provider"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: Calendar },
  { href: "/dashboard/news", label: "News", icon: Mail },
  { href: "/dashboard/forms", label: "Forms", icon: FileText },
  { href: "/dashboard/admins", label: "Admins", icon: Shield },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Use cached roles from LocalStorage/Context
  const { roles } = useRoles()

  // Filter nav items based on roles
  const filteredNavItems = navItems.filter((item) => {
    // Overview is always visible
    if (item.href === "/dashboard") return true

    // Super admin sees everything
    if (roles.super_admin) return true

    // Check specific permissions (safely handle undefined if roles not yet loaded)
    if (item.href === "/dashboard/events") return roles.events?.read
    if (item.href === "/dashboard/news") return roles.news?.read
    if (item.href === "/dashboard/forms") return roles.forms?.read
    if (item.href === "/dashboard/admins") return false // Only super_admin sees admin tab

    return false
  })

  return (
    <aside
      className={cn(
        "bg-card border-r border-border flex flex-col h-screen sticky top-0 transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && <h1 className="font-semibold text-lg text-foreground">Admin Panel</h1>}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        {!collapsed && (
          <Link href="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground">
            Privacy Policy
          </Link>
        )}
      </div>
    </aside>
  )
}

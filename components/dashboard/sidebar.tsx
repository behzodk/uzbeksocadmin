"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Calendar, Mail, FileText, ChevronLeft, ChevronRight, Shield, Menu, Trophy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRoles } from "@/components/dashboard/role-provider"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: Calendar },
  { href: "/dashboard/competetion", label: "Competetion", icon: Trophy },
  { href: "/dashboard/news", label: "News", icon: Mail },
  { href: "/dashboard/forms", label: "Forms", icon: FileText },
  { href: "/dashboard/admins", label: "Admins", icon: Shield },
]

interface SidebarNavContentProps {
  collapsed?: boolean
  onNavigate?: () => void
  mobile?: boolean
}

function SidebarNavContent({ collapsed = false, onNavigate, mobile = false }: SidebarNavContentProps) {
  const pathname = usePathname()
  const { roles } = useRoles()

  const filteredNavItems = navItems.filter((item) => {
    if (item.href === "/dashboard") return true

    if (roles.super_admin) return true

    if (item.href === "/dashboard/events") return roles.events?.read
    if (item.href === "/dashboard/competetion") return roles.competitions?.read
    if (item.href === "/dashboard/news") return roles.news?.read
    if (item.href === "/dashboard/forms") return roles.forms?.read
    if (item.href === "/dashboard/admins") return false

    return false
  })

  return (
    <>
      {mobile && (
        <div className="border-b border-border p-4">
          <h1 className="text-lg font-semibold text-foreground">Navigation</h1>
          <p className="mt-1 text-sm text-muted-foreground">Open a section from the admin dashboard.</p>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
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
              onClick={onNavigate}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-border">
        {!collapsed && (
          <Link
            href="/privacy-policy"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={onNavigate}
          >
            Privacy Policy
          </Link>
        )}
      </div>
    </>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen flex-col border-r border-border bg-card transition-all duration-300 xl:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center justify-between border-b border-border p-4">
        {!collapsed && <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <SidebarNavContent collapsed={collapsed} />
    </aside>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <div className="xl:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[18rem] p-0">
          <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
          <div className="flex h-full flex-col bg-card">
            <SidebarNavContent mobile onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

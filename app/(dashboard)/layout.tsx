import type React from "react"
import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"

import { RoleProvider } from "@/components/dashboard/role-provider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    redirect("/sign-in")
  }

  let roles = data.user.app_metadata?.roles as {
    super_admin: boolean
    forms: { read: boolean; create: boolean; update: boolean; delete: boolean }
    news: { read: boolean; create: boolean; update: boolean; delete: boolean }
    events: { read: boolean; create: boolean; update: boolean; delete: boolean }
  } | undefined

  if (!roles) {
    const { data: adminUser } = await supabase
      .from("admins")
      .select("roles")
      .eq("email", data.user.email)
      .single()

    if (adminUser) {
      roles = adminUser.roles as typeof roles
    }
  }

  // Default to empty roles if still not found
  const finalRoles = roles || {
    super_admin: false,
    forms: { read: false, create: false, update: false, delete: false },
    news: { read: false, create: false, update: false, delete: false },
    events: { read: false, create: false, update: false, delete: false },
  }

  return (
    <RoleProvider serverRoles={finalRoles}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </RoleProvider>
  )
}

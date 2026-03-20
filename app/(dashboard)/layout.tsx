import type React from "react"
import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"

import { RoleProvider } from "@/components/dashboard/role-provider"
import { mergeAdminRoles, type AdminRoles } from "@/lib/admin-roles"

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

  let roles = data.user.app_metadata?.roles as AdminRoles | undefined

  if (!roles) {
    const { data: adminUser } = await supabase
      .from("admins")
      .select("roles")
      .eq("email", data.user.email)
      .single()

    if (adminUser) {
      roles = adminUser.roles as AdminRoles
    }
  }

  const finalRoles = mergeAdminRoles(roles)

  return (
    <RoleProvider serverRoles={finalRoles}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </RoleProvider>
  )
}

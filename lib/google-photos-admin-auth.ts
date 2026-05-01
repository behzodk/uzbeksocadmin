import { mergeAdminRoles, type AdminRoles, type ResourcePermissions } from "@/lib/admin-roles"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function requireGooglePhotosPermission(permission: keyof ResourcePermissions) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: "Unauthorized",
      status: 401,
    }
  }

  let roles = user.app_metadata?.roles as AdminRoles | undefined

  if (!roles && user.email) {
    const { data: adminUser } = await supabase.from("admins").select("roles").eq("email", user.email).single()

    if (adminUser) {
      roles = adminUser.roles as AdminRoles
    }
  }

  const finalRoles = mergeAdminRoles(roles)
  const allowed = finalRoles.super_admin || finalRoles.google_photos?.[permission]

  if (!allowed) {
    return {
      error: "Forbidden",
      status: 403,
    }
  }

  return {
    supabase,
    user,
    roles: finalRoles,
  }
}

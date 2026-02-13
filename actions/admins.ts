"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"

export interface Admin {
    id: string
    email: string
    roles: {
        super_admin: boolean
        form_access: boolean
        news_access: boolean
        events_access: boolean
    }
    created_at: string
}

export async function getAdmins() {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.from("admins").select("*").order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching admins:", error)
        return []
    }

    return data as Admin[]
}

export async function createAdmin(email: string, roles: Admin["roles"]) {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase.from("admins").insert({ email, roles }).select().single()

    if (error) {
        console.error("Error creating admin:", error)
        throw new Error(error.message)
    }

    revalidatePath("/dashboard/admins")
    return data as Admin
}

export async function updateAdmin(id: string, roles: Admin["roles"]) {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
        .from("admins")
        .update({ roles })
        .eq("id", id)
        .select()
        .single()

    if (error) {
        console.error("Error updating admin:", error)
        throw new Error(error.message)
    }

    revalidatePath("/dashboard/admins")
    return data as Admin
}

export async function deleteAdmin(id: string) {
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from("admins").delete().eq("id", id)

    if (error) {
        console.error("Error deleting admin:", error)
        throw new Error(error.message)
    }

    revalidatePath("/dashboard/admins")
}

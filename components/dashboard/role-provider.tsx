"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { mergeAdminRoles, type AdminRoles } from "@/lib/admin-roles"

interface RoleContextType {
    roles: AdminRoles
    loading: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({
    children,
    serverRoles,
}: {
    children: React.ReactNode
    serverRoles: AdminRoles
}) {
    const [roles, setRoles] = useState<AdminRoles>(serverRoles)
    const [loading, setLoading] = useState(true)

    // Initialize from LocalStorage if available
    useEffect(() => {
        try {
            const stored = localStorage.getItem("admin_roles")
            if (stored) {
                setRoles(mergeAdminRoles(JSON.parse(stored)))
            }
        } catch (e) {
            console.error("Failed to load roles from storage", e)
        } finally {
            setLoading(false)
        }
    }, [])

    // Sync Server Roles to State and LocalStorage
    // We prioritize serverRoles once they are available/change
    useEffect(() => {
        if (serverRoles) {
            setRoles(mergeAdminRoles(serverRoles))
            try {
                localStorage.setItem("admin_roles", JSON.stringify(mergeAdminRoles(serverRoles)))
            } catch (e) {
                console.error("Failed to save roles to storage", e)
            }
        }
    }, [serverRoles])

    return (
        <RoleContext.Provider value={{ roles, loading }}>
            {children}
        </RoleContext.Provider>
    )
}

export function useRoles() {
    const context = useContext(RoleContext)
    if (context === undefined) {
        throw new Error("useRoles must be used within a RoleProvider")
    }
    return context
}

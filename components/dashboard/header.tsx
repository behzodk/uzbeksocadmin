"use client"

import { Search, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { MobileSidebar } from "@/components/dashboard/sidebar"

export function Header() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [displayName, setDisplayName] = useState("Admin")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadUser() {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase.auth.getUser()
      const metadata = data.user?.user_metadata ?? {}
      const name = metadata.full_name || metadata.name || data.user?.email || "Admin"

      if (active) {
        setDisplayName(name)
        setAvatarUrl(metadata.avatar_url ?? null)
      }
    }

    loadUser()

    return () => {
      active = false
    }
  }, [])

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)

    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace("/sign-in")
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    router.refresh()
    // Small delay to show smooth animation
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex w-full flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <MobileSidebar />
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="h-8 bg-background pl-9 text-sm" />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon-sm" onClick={handleRefresh} title="Refresh Access">
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2 px-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl ?? "/admin-avatar.png"} />
                  <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? "Signing out..." : "Logout"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

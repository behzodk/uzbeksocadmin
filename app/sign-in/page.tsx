"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function checkSession() {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase.auth.getSession()
      if (active && data.session) {
        router.replace("/dashboard")
      }
    }

    checkSession()

    return () => {
      active = false
    }
  }, [router])

  async function handleGoogleSignIn() {
    setLoading(true)
    setErrorMessage(null)

    const redirect = searchParams.get("redirect")
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`,
        queryParams: {
          prompt: "select_account",
        },
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
    }
  }

  return (
    <>
      <Button className="w-full" size="lg" onClick={handleGoogleSignIn} disabled={loading}>
        Continue with Google
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Admin Access</p>
          <h1 className="text-3xl font-semibold text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground">Use Google to continue to the dashboard.</p>
        </div>
        <div className="mt-8 space-y-3">
          <Suspense fallback={<div className="flex w-full justify-center py-2"><Spinner /></div>}>
            <SignInContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
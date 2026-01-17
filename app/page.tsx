import { redirect } from "next/navigation"
import Link from "next/link"
import { ShieldAlert, Lock, AlertTriangle } from "lucide-react"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"

export default async function LandingPage() {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase.auth.getUser()

  if (data.user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-6 selection:bg-red-500/30">
      <div className="w-full max-w-2xl space-y-12 text-center">
        
        {/* Warning Header */}
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 mb-4 animate-pulse">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase text-red-500">
            Restricted Access
          </h1>
          <div className="h-px w-24 mx-auto bg-red-900/50" />
        </div>

        {/* Confidentiality Notice */}
        <div className="space-y-6 max-w-lg mx-auto">
          <p className="text-lg md:text-xl text-zinc-400 font-light leading-relaxed">
            This system contains <span className="text-zinc-100 font-medium">private and confidential information</span>.
            Access is strictly limited to authorized administrative personnel only.
          </p>
          
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-400">
                Unauthorized access attempts are monitored and logged. Any attempt to bypass security protocols or access data without explicit authorization may result in legal action.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-400">
                If you are not an administrator, please leave this page immediately. Do not attempt to log in or exploit this system.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
          <Link 
            href="/privacy-policy" 
            className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-zinc-800 hidden md:inline">•</span>
          <Link 
            href="/terms-of-service" 
            className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
          >
            Terms of Service
          </Link>
          <span className="text-zinc-800 hidden md:inline">•</span>
          <Link href="/sign-in">
            <Button variant="outline" className="border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 hover:border-zinc-700 transition-all">
              Admin Login
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="pt-12 text-xs text-zinc-700 font-mono uppercase tracking-widest">
          System ID: {Math.random().toString(36).substring(2, 10).toUpperCase()} • Secured
        </div>
      </div>
    </div>
  )
}

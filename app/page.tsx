import { redirect } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, Users, Calendar, Mail, Lock } from "lucide-react"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"

export default async function LandingPage() {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase.auth.getUser()

  if (data.user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/10">
      {/* Navigation / Header */}
      <header className="px-6 py-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <span>uzbeksoc admin</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms-of-service" className="hover:text-foreground transition-colors">Terms</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Description */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Organization Management System
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                A centralized internal platform designed for authorized administrators to manage members, coordinate events, and distribute newsletters efficiently.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-md bg-blue-500/10 text-blue-500 mt-1">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Member Directory</h3>
                  <p className="text-sm text-muted-foreground">Maintain comprehensive records of active members and their roles.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-md bg-purple-500/10 text-purple-500 mt-1">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Event Scheduling</h3>
                  <p className="text-sm text-muted-foreground">Create, publish, and manage upcoming organizational events.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 rounded-md bg-green-500/10 text-green-500 mt-1">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Newsletter Campaigns</h3>
                  <p className="text-sm text-muted-foreground">Draft and send updates to the entire organization.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Box */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <div className="text-center space-y-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold">Authorized Access Only</h2>
              <p className="text-sm text-muted-foreground">
                This application is restricted to authorized personnel. Please sign in with your organizational Google account to continue.
              </p>
            </div>

            <Link href="/sign-in" className="w-full block">
              <Button size="lg" className="w-full">
                Proceed to Login
              </Button>
            </Link>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our <Link href="/terms-of-service" className="underline hover:text-foreground">Terms of Service</Link> and <Link href="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>&copy; {new Date().getFullYear()} uzbeksoc. All rights reserved.</p>
      </footer>
    </div>
  )
}
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Mail, TrendingUp } from "lucide-react"
import { StatusBadge, getStatusVariant } from "@/components/dashboard/status-badge"

async function getDashboardStats() {
  const supabase = await getSupabaseServerClient()

  const [membersRes, eventsRes, newslettersRes] = await Promise.all([
    supabase.from("members").select("*", { count: "exact" }),
    supabase.from("events").select("*", { count: "exact" }),
    supabase.from("news").select("*", { count: "exact" }),
  ])

  const members = membersRes.data || []
  const events = eventsRes.data || []
  const news = newslettersRes.data || []

  return {
    totalMembers: membersRes.count || 0,
    activeMembers: members.filter((m) => m.status === "active").length,
    totalEvents: eventsRes.count || 0,
    upcomingEvents: events.filter((e) => e.status === "published" && new Date(e.start_date) > new Date()).length,
    totalNews: newslettersRes.count || 0,
    sentNews: news.filter((n) => n.status === "published").length,
    recentEvents: events.slice(0, 5),
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your organization.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Members"
          value={stats.totalMembers}
          subtitle={`${stats.activeMembers} active`}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Total Events"
          value={stats.totalEvents}
          subtitle={`${stats.upcomingEvents} upcoming`}
          icon={Calendar}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="News"
          value={stats.totalNews}
          subtitle={`${stats.sentNews} published`}
          icon={Mail}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Engagement Rate"
          value="78%"
          subtitle="Avg. open rate"
          icon={TrendingUp}
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentEvents.filter((e) => new Date(e.start_date) > new Date()).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
              ) : (
                stats.recentEvents
                  .filter((e) => new Date(e.start_date) > new Date())
                  .slice(0, 5)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.start_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <StatusBadge status={event.status} variant={getStatusVariant(event.status)} />
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

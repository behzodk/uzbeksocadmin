export interface Member {
  id: string
  email: string
  full_name: string
  first_name?: string | null
  last_name?: string | null
  role: "admin" | "member" | "moderator"
  status: "active" | "inactive" | "pending"
  avatar_url: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

export interface ScheduleItem {
  time: string
  title: string
  description?: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  slug: string | null
  content_html: string | null
  featured_image: string | null
  location: string | null
  start_date: string
  end_date: string | null
  capacity: number | null
  status: "draft" | "published" | "cancelled" | "completed"
  visibility: "public" | "private"
  event_type: string
  is_featured: boolean
  highlights: string[] | null
  what_to_bring: string[] | null
  schedule: ScheduleItem[] | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Newsletter {
  id: string
  subject: string
  content: string
  slug: string | null
  content_html: string | null
  status: "draft" | "scheduled" | "sent"
  scheduled_at: string | null
  sent_at: string | null
  recipient_count: number
  open_rate: number | null
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  totalMembers: number
  activeMembers: number
  totalEvents: number
  upcomingEvents: number
  totalNewsletters: number
  sentNewsletters: number
}

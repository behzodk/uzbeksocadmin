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
  cover_image: string | null
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

export interface News {
  id: string
  subject: string
  content: string
  featured_image: string | null
  slug: string | null
  content_html: string | null
  status: "draft" | "scheduled" | "published"
  scheduled_at: string | null
  sent_at: string | null
  recipient_count: number
  open_rate: number | null
  created_at: string
  updated_at: string
}

export type FormFieldType = "text" | "email" | "select" | "multi_select" | "boolean"

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  key: string
  required: boolean
  options?: string[]
  is_ranked?: boolean
  order?: number
  min_count?: number | null
  max_count?: number | null
}

export interface FormSchema {
  fields: FormField[]
}

export interface Form {
  id: string
  slug: string
  title: string
  is_active: boolean
  schema: FormSchema
  event_id: string | null
  created_at: string
}

export interface FormSubmission {
  id: string
  form_id: string
  status: string
  answers: Record<string, unknown>
  created_at: string
}

export interface DashboardStats {
  totalMembers: number
  activeMembers: number
  totalEvents: number
  upcomingEvents: number
  totalNews: number
  sentNews: number
}

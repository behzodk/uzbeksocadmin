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

export interface Competition {
  id: string
  title: string
  description: string | null
  slug: string | null
  content_html: string | null
  location: string | null
  start_date: string
  end_date: string | null
  registration_deadline: string | null
  capacity: number | null
  prize: string | null
  featured_image: string | null
  featured_image_path?: string | null
  entry_label: string
  rating_criteria: CompetitionRatingCriterion[] | null
  leaderboard_settings: CompetitionLeaderboardSettings | null
  voter_validation_settings: CompetitionVoterValidationSettings | null
  status: "draft" | "published" | "cancelled" | "completed"
  visibility: "public" | "private"
  is_featured: boolean
  created_at: string
  updated_at: string
}

export type CompetitionRatingScaleType = "numeric" | "stars"

export interface CompetitionRatingCriterion {
  id: string
  label: string
  description?: string | null
  scale_type: CompetitionRatingScaleType
  scale_min: number
  scale_max: number
  weight_percentage: number
}

export type CompetitionLeaderboardMethod = "average" | "behzod_formula"

export interface CompetitionLeaderboardSettings {
  result_max: number
  scoring_method: CompetitionLeaderboardMethod
  minimum_ratings_threshold: number
}

export type CompetitionRatingIdentityField = "guest_email"

export interface CompetitionVoterValidationSettings {
  rating_identity_field: CompetitionRatingIdentityField
  eligibility_form_id: string | null
  eligibility_form_field_key: string | null
}

export interface CompetitionEntry {
  id: string
  competition_id: string
  competitor_name: string
  competitor_email: string | null
  competitor_phone: string | null
  entry_name: string
  entry_description: string | null
  entry_image: string | null
  entry_image_path?: string | null
  rating_public_id: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  updated_at: string
}

export interface CompetitionEntryRating {
  id: string
  entry_id: string
  competition_id: string
  guest_name: string | null
  guest_email: string | null
  voter_identity?: string | null
  scores: Record<string, number>
  total_score: number | null
  notes: string | null
  created_at: string
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

export type FormFieldType = "text" | "email" | "select" | "multi_select" | "boolean" | "rating" | "image" | "content"

export interface FieldConditional {
  field_key: string
  option: string
}

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  key: string
  content_html?: string | null
  required: boolean
  is_secure?: boolean
  options?: string[]
  use_radio_buttons?: boolean
  is_ranked?: boolean
  order?: number
  min_count?: number | null
  max_count?: number | null
  scale_min?: number | null
  scale_max?: number | null
  scale_type?: "numeric" | "stars"
  allow_float?: boolean
  min_label?: string | null
  max_label?: string | null
  conditional?: FieldConditional
  is_student_email?: boolean
}

export interface FormSchema {
  fields: FormField[]
}

export interface FormPartner {
  id: string
  name: string
  logo_url: string
  logo_path: string | null
  url: string
}

export interface Form {
  id: string
  slug: string
  title: string
  is_active: boolean
  max_response: number | null
  schema: FormSchema
  partners: FormPartner[]
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

export interface EventPhotoAsset {
  id: string
  event_id: string
  file_name: string
  storage_path: string
  public_url: string
  mime_type: string | null
  file_size: number | null
  created_at: string
}

export interface EventPhotoArchive {
  id: string
  event_id: string
  file_name: string
  storage_path: string
  public_url: string
  asset_count: number
  file_size: number | null
  photo_asset_ids: string[]
  created_by: string | null
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

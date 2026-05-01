import { getSupabaseServerClient } from "@/lib/supabase/server"
import { GooglePhotosClient } from "./google-photos-client"

async function getEvents() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("events")
    .select("id, title, start_date")
    .order("start_date", { ascending: false })

  if (!error && data) {
    return data
  }

  console.error("Error fetching events for photo uploads with start_date ordering:", error)

  const fallback = await supabase.from("events").select("id, title").order("title", { ascending: true })

  if (fallback.error) {
    console.error("Fallback event query for photo uploads also failed:", fallback.error)
    return []
  }

  return fallback.data.map((event) => ({
    ...event,
    start_date: null,
  }))
}

async function getPhotoAssets() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("event_photo_assets").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching event photo assets:", error)
    return []
  }

  return data
}

async function getPhotoArchives() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("event_photo_archives").select("*").order("created_at", { ascending: false })

  if (error) {
    if (/relation .*event_photo_archives.* does not exist/i.test(error.message)) {
      console.warn("event_photo_archives table is not set up yet. Run scripts/018-create-event-photo-archives.sql.")
      return []
    }

    console.error("Error fetching event photo archives:", error)
    return []
  }

  return data
}

export default async function GooglePhotosPage() {
  const [events, assets, archives] = await Promise.all([getEvents(), getPhotoAssets(), getPhotoArchives()])

  return <GooglePhotosClient events={events} initialAssets={assets} initialArchives={archives} />
}

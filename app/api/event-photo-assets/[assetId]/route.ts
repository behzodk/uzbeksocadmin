import { NextResponse } from "next/server"
import { z } from "zod"
import { deleteEventPhotoObject } from "@/lib/cloudflare-r2"
import { requireGooglePhotosPermission } from "@/lib/google-photos-admin-auth"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const paramsSchema = z.object({
  assetId: z.string().uuid(),
})

export async function DELETE(_: Request, context: { params: Promise<{ assetId: string }> }) {
  const auth = await requireGooglePhotosPermission("delete")

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { assetId } = paramsSchema.parse(await context.params)
    const supabase = getSupabaseAdminClient()

    const { data: asset, error: fetchError } = await supabase
      .from("event_photo_assets")
      .select("id, storage_path")
      .eq("id", assetId)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: "Photo not found." }, { status: 404 })
    }

    await deleteEventPhotoObject(asset.storage_path)

    const { error: deleteError } = await supabase.from("event_photo_assets").delete().eq("id", assetId)

    if (deleteError) {
      throw new Error(deleteError.message || "Unable to delete this photo.")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete this photo."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

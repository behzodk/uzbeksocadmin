"use client"

import { type ChangeEvent, useRef, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { removeCompetitionImage, uploadCompetitionImage } from "@/lib/competition-image-storage"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"

interface CompetitionImageUploadFieldProps {
  id: string
  label: string
  imageUrl: string
  storagePath?: string | null
  folder: string
  hint?: string
  onChange: (value: { imageUrl: string; storagePath: string }) => void
  onClear: () => void
}

export function CompetitionImageUploadField({
  id,
  label,
  imageUrl,
  storagePath,
  folder,
  hint,
  onChange,
  onClear,
}: CompetitionImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const { publicUrl, path } = await uploadCompetitionImage({
        supabase,
        file,
        folder,
        existingPath: storagePath || null,
      })

      onChange({
        imageUrl: publicUrl,
        storagePath: path,
      })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload image.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      await removeCompetitionImage({
        supabase,
        storagePath: storagePath || null,
      })
      onClear()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove image.")
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <input
          id={id}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isRemoving}
          >
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            {imageUrl ? "Replace Image" : "Upload From Device"}
          </Button>
          {imageUrl && (
            <Button type="button" variant="ghost" onClick={handleRemove} disabled={isUploading || isRemoving}>
              {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4 text-destructive" />}
              Remove Image
            </Button>
          )}
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {imageUrl && (
        <div className="overflow-hidden rounded-xl border border-border">
          <img src={imageUrl} alt={label} className="max-h-72 w-full object-cover" />
        </div>
      )}
    </div>
  )
}

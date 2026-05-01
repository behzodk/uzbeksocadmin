"use client"

import { type ChangeEvent, useRef, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { removeFormImage, uploadFormImage } from "@/lib/form-image-storage"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"

interface FormPartnerLogoUploadFieldProps {
  id: string
  label: string
  imageUrl: string
  storagePath?: string | null
  folder: string
  hint?: string
  onChange: (value: { imageUrl: string; storagePath: string }) => void
  onClear: () => void
}

export function FormPartnerLogoUploadField({
  id,
  label,
  imageUrl,
  storagePath,
  folder,
  hint,
  onChange,
  onClear,
}: FormPartnerLogoUploadFieldProps) {
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
      const { publicUrl, path } = await uploadFormImage({
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
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload logo.")
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
      await removeFormImage({
        supabase,
        storagePath: storagePath || null,
      })
      onClear()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove logo.")
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
            {imageUrl ? "Replace Logo" : "Upload Logo"}
          </Button>
          {imageUrl && (
            <Button type="button" variant="ghost" onClick={handleRemove} disabled={isUploading || isRemoving}>
              {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4 text-destructive" />}
              Remove Logo
            </Button>
          )}
        </div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      {imageUrl ? (
        <div className="overflow-hidden rounded-xl border border-border bg-background p-4">
          <img src={imageUrl} alt={label} className="h-20 w-full object-contain" />
        </div>
      ) : null}
    </div>
  )
}

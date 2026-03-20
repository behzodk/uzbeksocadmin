"use client"

import { useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Download, ExternalLink, Loader2, QrCode } from "lucide-react"

interface EntryRatingQrDialogProps {
  entryName: string
  ratingPublicId: string
}

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function EntryRatingQrDialog({ entryName, ratingPublicId }: EntryRatingQrDialogProps) {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || ""
  const [open, setOpen] = useState(false)
  const [ratingUrl, setRatingUrl] = useState(configuredBaseUrl ? `https://uzbeksoc.co.uk/competitions/rate/${ratingPublicId}` : "")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fileName = useMemo(() => `${slugifyFileName(entryName || "entry") || "entry"}-rating-qr.png`, [entryName])

  useEffect(() => {
    if (!open) return

    const baseUrl = configuredBaseUrl || window.location.origin
    setRatingUrl(`${baseUrl}/competitions/rate/${ratingPublicId}`)
  }, [configuredBaseUrl, open, ratingPublicId])

  useEffect(() => {
    if (!open || !ratingUrl) return

    let cancelled = false
    setIsGenerating(true)
    setError(null)

    QRCode.toDataURL(ratingUrl, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#111827",
        light: "#FFFFFFFF",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl)
          setIsGenerating(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to generate the QR code for this rating link.")
          setIsGenerating(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, ratingUrl])

  const handleCopy = async () => {
    if (!ratingUrl) return

    await navigator.clipboard.writeText(ratingUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const handleDownload = () => {
    if (!qrDataUrl) return

    const anchor = document.createElement("a")
    anchor.href = qrDataUrl
    anchor.download = fileName
    anchor.click()
  }

  const handleOpenLink = () => {
    if (!ratingUrl) return
    window.open(ratingUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => event.stopPropagation()}
          title="Show rating QR code"
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{entryName} Rating QR</DialogTitle>
          <DialogDescription>
            Scan this QR code to open the public rating page for this entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/30 p-6">
            <div className="flex min-h-72 items-center justify-center rounded-xl bg-white p-4">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating QR code...
                </div>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : qrDataUrl ? (
                <img src={qrDataUrl} alt={`${entryName} rating QR code`} className="h-72 w-72 rounded-lg object-contain" />
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating_link">Rating Link</Label>
            <Input id="rating_link" value={ratingUrl} readOnly />
            {!configuredBaseUrl && (
              <p className="text-xs text-muted-foreground">
                QR links use the current browser origin. Set `NEXT_PUBLIC_SITE_URL` if you want a fixed public domain.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleCopy} disabled={!ratingUrl}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied" : "Copy Link"}
            </Button>
            <Button type="button" variant="outline" onClick={handleDownload} disabled={!qrDataUrl}>
              <Download className="mr-2 h-4 w-4" />
              Download QR
            </Button>
            <Button type="button" onClick={handleOpenLink} disabled={!ratingUrl}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Rating Page
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

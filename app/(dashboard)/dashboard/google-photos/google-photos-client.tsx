"use client"

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import type { EventPhotoArchive, EventPhotoAsset } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useRoles } from "@/components/dashboard/role-provider"
import { DataTable } from "@/components/dashboard/data-table"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createEventPhotoArchive } from "@/lib/event-photo-archives"
import { createEventPhotoAsset, removeEventPhoto, uploadEventPhotoWithProgress } from "@/lib/event-photo-storage"
import { Archive, Download, ExternalLink, Images, Loader2, Trash2, Upload, X } from "lucide-react"

interface GooglePhotosClientProps {
  events: Array<{
    id: string
    title: string
    start_date: string | null
  }>
  initialAssets: EventPhotoAsset[]
  initialArchives: EventPhotoArchive[]
}

interface UploadQueueItem {
  id: string
  file: File
  progress: number
  status: "queued" | "uploading" | "saving" | "done" | "error"
  error: string | null
}

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const amount = value / 1024 ** exponent

  return `${amount >= 10 || exponent === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[exponent]}`
}

function formatEventLabel(event: GooglePhotosClientProps["events"][number]) {
  if (!event.start_date) {
    return event.title
  }

  const date = new Date(event.start_date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return `${event.title} • ${date}`
}

export function GooglePhotosClient({ events, initialAssets, initialArchives }: GooglePhotosClientProps) {
  const router = useRouter()
  const { roles, loading } = useRoles()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [assets, setAssets] = useState<EventPhotoAsset[]>(initialAssets)
  const [archives, setArchives] = useState<EventPhotoArchive[]>(initialArchives)
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || "")
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [queue, setQueue] = useState<UploadQueueItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isCreatingArchive, setIsCreatingArchive] = useState(false)
  const [overallProgress, setOverallProgress] = useState<number | null>(null)
  const [currentFileName, setCurrentFileName] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<EventPhotoAsset | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canRead = roles.super_admin || roles.google_photos?.read
  const canCreate = roles.super_admin || roles.google_photos?.create
  const canDelete = roles.super_admin || roles.google_photos?.delete

  useEffect(() => {
    if (!loading && !canRead) {
      router.push("/dashboard?error=unauthorized")
    }
  }, [canRead, loading, router])

  const eventLookup = useMemo(() => new Map(events.map((event) => [event.id, event])), [events])

  const totalSize = useMemo(() => assets.reduce((sum, asset) => sum + Number(asset.file_size || 0), 0), [assets])
  const linkedEventsCount = useMemo(() => new Set(assets.map((asset) => asset.event_id)).size, [assets])
  const queuedFilesSize = useMemo(() => queue.reduce((sum, item) => sum + item.file.size, 0), [queue])
  const filteredAssets = useMemo(
    () => (selectedEventId ? assets.filter((asset) => asset.event_id === selectedEventId) : assets),
    [assets, selectedEventId],
  )
  const filteredArchives = useMemo(
    () => (selectedEventId ? archives.filter((archive) => archive.event_id === selectedEventId) : archives),
    [archives, selectedEventId],
  )
  const allFilteredSelected = filteredAssets.length > 0 && filteredAssets.every((asset) => selectedAssetIds.includes(asset.id))

  const selectedEvent = selectedEventId ? eventLookup.get(selectedEventId) : undefined

  useEffect(() => {
    setSelectedAssetIds([])
  }, [selectedEventId])

  const handleChooseFiles = () => {
    fileInputRef.current?.click()
  }

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"))

    if (files.length === 0) {
      return
    }

    setPageError(null)
    setQueue((prev) => [
      ...prev,
      ...files.map((file) => ({
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        progress: 0,
        status: "queued" as const,
        error: null,
      })),
    ])

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const updateQueueItem = (id: string, updater: (item: UploadQueueItem) => UploadQueueItem) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? updater(item) : item)))
  }

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== "done"))
  }

  const removeQueuedItem = (id: string) => {
    if (isUploading) return
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }

  const toggleAssetSelection = (assetId: string, checked: boolean) => {
    setSelectedAssetIds((prev) => {
      if (checked) {
        return prev.includes(assetId) ? prev : [...prev, assetId]
      }

      return prev.filter((id) => id !== assetId)
    })
  }

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedAssetIds(checked ? filteredAssets.map((asset) => asset.id) : [])
  }

  const handleUpload = async () => {
    if (!selectedEventId) {
      setPageError("Choose an event before uploading photos.")
      return
    }

    const itemsToUpload = queue.filter((item) => item.status === "queued" || item.status === "error")

    if (itemsToUpload.length === 0) {
      setPageError("Choose at least one photo to upload.")
      return
    }

    setIsUploading(true)
    setPageError(null)
    setOverallProgress(0)

    const totalBytes = itemsToUpload.reduce((sum, item) => sum + item.file.size, 0) || 1
    let processedBytes = 0
    for (const item of itemsToUpload) {
      setCurrentFileName(item.file.name)
      updateQueueItem(item.id, (current) => ({
        ...current,
        status: "uploading",
        progress: 0,
        error: null,
      }))

      try {
        const uploadResult = await uploadEventPhotoWithProgress({
          file: item.file,
          eventId: selectedEventId,
          onProgress: (loaded) => {
            const itemProgress = item.file.size > 0 ? (loaded / item.file.size) * 100 : 0
            updateQueueItem(item.id, (current) => ({
              ...current,
              progress: itemProgress,
              status: "uploading",
            }))
            setOverallProgress(Math.min(100, ((processedBytes + loaded) / totalBytes) * 100))
          },
        })

        updateQueueItem(item.id, (current) => ({
          ...current,
          progress: 100,
          status: "saving",
        }))

        const payload = {
          eventId: selectedEventId,
          fileName: item.file.name,
          storagePath: uploadResult.path,
          publicUrl: uploadResult.publicUrl,
          mimeType: item.file.type || null,
          fileSize: item.file.size,
        }

        const data = (await createEventPhotoAsset(payload)) as EventPhotoAsset

        setAssets((prev) => [data, ...prev])
        updateQueueItem(item.id, (current) => ({
          ...current,
          progress: 100,
          status: "done",
          error: null,
        }))
      } catch (uploadError) {
        updateQueueItem(item.id, (current) => ({
          ...current,
          status: "error",
          error: uploadError instanceof Error ? uploadError.message : "Upload failed.",
        }))
      } finally {
        processedBytes += item.file.size
        setOverallProgress(Math.min(100, (processedBytes / totalBytes) * 100))
      }
    }

    setCurrentFileName(null)
    setIsUploading(false)
    router.refresh()
  }

  const handleCreateArchive = async () => {
    if (!selectedEventId) {
      setPageError("Choose an event before creating a ZIP archive.")
      return
    }

    if (selectedAssetIds.length === 0) {
      setPageError("Select at least one photo to include in the ZIP archive.")
      return
    }

    setIsCreatingArchive(true)
    setPageError(null)

    try {
      const archive = (await createEventPhotoArchive({
        eventId: selectedEventId,
        assetIds: selectedAssetIds,
      })) as EventPhotoArchive

      setArchives((prev) => [archive, ...prev])
      setSelectedAssetIds([])
      router.refresh()
    } catch (archiveError) {
      setPageError(archiveError instanceof Error ? archiveError.message : "Unable to create the ZIP archive.")
    } finally {
      setIsCreatingArchive(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingAsset) return

    setIsDeleting(true)
    setPageError(null)

    try {
      await removeEventPhoto(deletingAsset.id)

      setAssets((prev) => prev.filter((asset) => asset.id !== deletingAsset.id))
      setSelectedAssetIds((prev) => prev.filter((id) => id !== deletingAsset.id))
      setDeletingAsset(null)
      router.refresh()
    } catch (deleteError) {
      setPageError(deleteError instanceof Error ? deleteError.message : "Unable to delete this photo.")
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    {
      key: "select",
      header: "Select",
      render: (asset: EventPhotoAsset) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={selectedAssetIds.includes(asset.id)}
            onCheckedChange={(checked) => toggleAssetSelection(asset.id, checked === true)}
            aria-label={`Select ${asset.file_name}`}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ),
    },
    {
      key: "preview",
      header: "Photo",
      render: (asset: EventPhotoAsset) => (
        <div className="flex items-center gap-3">
          <img src={asset.public_url} alt={asset.file_name} className="h-14 w-14 rounded-lg object-cover" />
          <div>
            <p className="font-medium">{asset.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {eventLookup.get(asset.event_id)?.title || "Unknown event"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "file_size",
      header: "Size",
      render: (asset: EventPhotoAsset) => <span className="text-sm">{formatBytes(asset.file_size)}</span>,
    },
    {
      key: "created_at",
      header: "Uploaded",
      render: (asset: EventPhotoAsset) => (
        <span className="text-sm">
          {new Date(asset.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (asset: EventPhotoAsset) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation()
              window.open(asset.public_url, "_blank", "noopener,noreferrer")
            }}
            title="Open image"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation()
                setDeletingAsset(asset)
              }}
              title="Delete image"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const archiveColumns = [
    {
      key: "file_name",
      header: "Archive",
      render: (archive: EventPhotoArchive) => (
        <div>
          <p className="font-medium">{archive.file_name}</p>
          <p className="text-xs text-muted-foreground">
            {eventLookup.get(archive.event_id)?.title || "Unknown event"}
          </p>
        </div>
      ),
    },
    {
      key: "asset_count",
      header: "Photos",
      render: (archive: EventPhotoArchive) => <Badge variant="secondary">{archive.asset_count} photos</Badge>,
    },
    {
      key: "file_size",
      header: "ZIP Size",
      render: (archive: EventPhotoArchive) => <span className="text-sm">{formatBytes(archive.file_size)}</span>,
    },
    {
      key: "created_at",
      header: "Created",
      render: (archive: EventPhotoArchive) => (
        <span className="text-sm">
          {new Date(archive.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (archive: EventPhotoArchive) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation()
              window.open(archive.public_url, "_blank", "noopener,noreferrer")
            }}
            title="Open archive"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation()
              window.open(archive.public_url, "_blank", "noopener,noreferrer")
            }}
            title="Download archive"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Google Photos Shareables</h1>
          <p className="mt-1 text-muted-foreground">
            Manually upload many event photos to Cloudflare R2 and keep each file linked to its event.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Total Photos" value={assets.length} icon={Images} />
        <StatsCard title="Linked Events" value={linkedEventsCount} icon={Images} />
        <StatsCard title="Stored Size" value={formatBytes(totalSize)} icon={Upload} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="event_id">Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger id="event_id">
                  <SelectValue placeholder="Choose an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {formatEventLabel(event)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEvent ? (
                <p className="text-xs text-muted-foreground">Photos uploaded now will be linked to {selectedEvent.title}.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Choose an event before starting the upload.</p>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={handleChooseFiles} disabled={!canCreate || isUploading}>
                  Choose Photos
                </Button>
                <Button type="button" onClick={handleUpload} disabled={!canCreate || isUploading || queue.length === 0 || !selectedEventId}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {isUploading ? "Uploading..." : "Start Upload"}
                </Button>
                {queue.some((item) => item.status === "done") && (
                  <Button type="button" variant="ghost" onClick={clearCompleted} disabled={isUploading}>
                    Clear Completed
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Upload multiple photos at once. Progress bars update while each large file is being sent to Cloudflare R2.
              </p>
              <p className="text-xs text-muted-foreground">
                {queue.length > 0
                  ? `${queue.length} file${queue.length === 1 ? "" : "s"} queued • ${formatBytes(queuedFilesSize)}`
                  : "No files selected yet."}
              </p>
            </div>
          </div>

          {pageError && <p className="text-sm text-destructive">{pageError}</p>}

          {(isUploading || overallProgress !== null) && (
            <div className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Overall Upload Progress</p>
                <p className="text-sm text-muted-foreground">{Math.round(overallProgress || 0)}%</p>
              </div>
              <Progress value={overallProgress || 0} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {currentFileName ? `Currently uploading ${currentFileName}` : isUploading ? "Preparing upload..." : "Upload complete."}
              </p>
            </div>
          )}

          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Selected Files</p>
                <p className="text-xs text-muted-foreground">
                  {queue.filter((item) => item.status === "done").length} complete · {queue.filter((item) => item.status === "error").length} failed
                </p>
              </div>
              <div className="space-y-3">
                {queue.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.file.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatBytes(item.file.size)} • {item.status}
                        </p>
                      </div>
                      {!isUploading && item.status !== "uploading" && item.status !== "saving" && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeQueuedItem(item.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      <Progress value={item.progress} />
                      {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Event Photos</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedEvent
                  ? `Showing ${filteredAssets.length} uploaded photos linked to ${selectedEvent.title}.`
                  : "Choose an event to review and archive its uploaded photos."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => toggleSelectAllFiltered(!allFilteredSelected)}
                disabled={filteredAssets.length === 0 || isCreatingArchive}
              >
                {allFilteredSelected ? "Clear Event Selection" : "Select Event Photos"}
              </Button>
              <Button
                type="button"
                onClick={handleCreateArchive}
                disabled={!canCreate || isCreatingArchive || selectedAssetIds.length === 0 || !selectedEventId}
              >
                {isCreatingArchive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                {isCreatingArchive ? "Creating ZIP..." : `Create ZIP (${selectedAssetIds.length})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{filteredAssets.length} event photos</Badge>
            <Badge variant="secondary">{selectedAssetIds.length} selected</Badge>
            {selectedEvent && <Badge variant="outline">{selectedEvent.title}</Badge>}
          </div>
          <DataTable
            data={filteredAssets}
            columns={columns}
            searchPlaceholder="Search uploaded photos..."
            searchKey="file_name"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Saved ZIP Archives</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Generated archives are stored in Supabase Storage so they can be reused without rebuilding.
              </p>
            </div>
            <Badge variant="secondary">{filteredArchives.length} archives</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredArchives}
            columns={archiveColumns}
            searchPlaceholder="Search ZIP archives..."
            searchKey="file_name"
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deletingAsset}
        onOpenChange={(open) => !open && setDeletingAsset(null)}
        title="Delete Photo"
        description={`Are you sure you want to delete "${deletingAsset?.file_name}"? This removes the file from Supabase Storage.`}
        onConfirm={handleDelete}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        variant="destructive"
      />
    </div>
  )
}

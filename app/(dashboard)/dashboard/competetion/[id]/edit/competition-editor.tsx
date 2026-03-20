"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Competition, CompetitionLeaderboardMethod, Form, FormField } from "@/lib/types"
import {
  getCriterionWeightTotal,
  type NormalizedCompetitionRatingCriterion,
  normalizeLeaderboardSettings,
  normalizeRatingCriteria,
  rebalanceCriterionWeights,
} from "@/lib/competition-scoring"
import { normalizeCompetitionVoterValidationSettings } from "@/lib/competition-voter-validation"
import { CompetitionImageUploadField } from "@/components/competition/competition-image-upload-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { ContentPreview } from "@/components/editor/content-preview"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRoles } from "@/components/dashboard/role-provider"
import {
  ArrowLeft,
  Save,
  Eye,
  Edit3,
  Globe,
  MapPin,
  CalendarDays,
  Trophy,
  Loader2,
  Star,
  Users,
  Plus,
  Trash2,
  ListChecks,
  Equal,
  Sigma,
} from "lucide-react"

interface CompetitionEditorProps {
  competition: Competition | null
  forms: Form[]
}

function createCriterionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `criterion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createEmptyCriterion(): NormalizedCompetitionRatingCriterion {
  return {
    id: createCriterionId(),
    label: "",
    description: "",
    scale_type: "stars",
    scale_min: 1,
    scale_max: 5,
    weight_percentage: 100,
  }
}

function getComparableFormFields(form: Form | null | undefined) {
  return (form?.schema?.fields || []).filter((field: FormField) => ["email", "text"].includes(field.type))
}

export function CompetitionEditor({ competition, forms }: CompetitionEditorProps) {
  const router = useRouter()
  const { roles, loading } = useRoles()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("edit")

  const canSave = competition
    ? roles.super_admin || roles.competitions?.update
    : roles.super_admin || roles.competitions?.create

  useEffect(() => {
    if (!loading) {
      if (competition && !roles.super_admin && !roles.competitions?.update && !roles.competitions?.read) {
        router.push("/dashboard/competetion?error=unauthorized")
      }

      if (!competition && !roles.super_admin && !roles.competitions?.create) {
        router.push("/dashboard/competetion?error=unauthorized")
      }
    }
  }, [competition, loading, roles, router])

  const [formData, setFormData] = useState(() => ({
    title: competition?.title || "",
    slug: competition?.slug || "",
    description: competition?.description || "",
    content_html: competition?.content_html || "",
    location: competition?.location || "",
    start_date: competition?.start_date ? new Date(competition.start_date).toISOString().slice(0, 16) : "",
    end_date: competition?.end_date ? new Date(competition.end_date).toISOString().slice(0, 16) : "",
    registration_deadline: competition?.registration_deadline
      ? new Date(competition.registration_deadline).toISOString().slice(0, 16)
      : "",
    capacity: competition?.capacity?.toString() || "",
    prize: competition?.prize || "",
    featured_image: competition?.featured_image || "",
    featured_image_path: competition?.featured_image_path || "",
    entry_label: competition?.entry_label || "Entry",
    rating_criteria: normalizeRatingCriteria(competition?.rating_criteria),
    leaderboard_settings: normalizeLeaderboardSettings(competition?.leaderboard_settings),
    voter_validation_settings: normalizeCompetitionVoterValidationSettings(competition?.voter_validation_settings),
    status: competition?.status || "draft",
    visibility: competition?.visibility || "private",
    is_featured: competition?.is_featured || false,
  }))

  useEffect(() => {
    if (!competition && formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [competition, formData.title])

  const weightTotal = useMemo(() => getCriterionWeightTotal(formData.rating_criteria), [formData.rating_criteria])
  const hasBlankCriteriaLabel = formData.rating_criteria.some((criterion) => !criterion.label.trim())
  const hasCriteria = formData.rating_criteria.length > 0
  const hasValidWeights = !hasCriteria || Math.abs(weightTotal - 100) < 0.01
  const selectedEligibilityForm = useMemo(
    () => forms.find((form) => form.id === formData.voter_validation_settings.eligibility_form_id) || null,
    [formData.voter_validation_settings.eligibility_form_id, forms],
  )
  const comparableFormFields = useMemo(
    () => getComparableFormFields(selectedEligibilityForm),
    [selectedEligibilityForm],
  )

  const validationMessage = useMemo(() => {
    if (hasBlankCriteriaLabel) {
      return "Each criterion needs a label, or remove the unfinished criterion."
    }

    if (!hasValidWeights) {
      return `Criterion weights must total 100%. Current total: ${weightTotal}%.`
    }

    if (formData.leaderboard_settings.result_max <= 0) {
      return "Leaderboard result max must be greater than 0."
    }

    if (formData.leaderboard_settings.minimum_ratings_threshold < 1) {
      return "Minimum ratings threshold must be at least 1."
    }

    const hasEligibilityFormId = !!formData.voter_validation_settings.eligibility_form_id
    const hasEligibilityFieldKey = !!formData.voter_validation_settings.eligibility_form_field_key

    if (hasEligibilityFormId !== hasEligibilityFieldKey) {
      return "Choose both a registration form and a registration form field to enforce voter email validation."
    }

    if (
      hasEligibilityFieldKey &&
      !comparableFormFields.some((field) => field.key === formData.voter_validation_settings.eligibility_form_field_key)
    ) {
      return "The selected registration form field is not available on the chosen form."
    }

    return null
  }, [
    comparableFormFields,
    formData.leaderboard_settings.minimum_ratings_threshold,
    formData.leaderboard_settings.result_max,
    formData.voter_validation_settings.eligibility_form_field_key,
    formData.voter_validation_settings.eligibility_form_id,
    hasBlankCriteriaLabel,
    hasValidWeights,
    weightTotal,
  ])

  const addCriterion = () => {
    setFormData((prev) => ({
      ...prev,
      rating_criteria: rebalanceCriterionWeights([...prev.rating_criteria, createEmptyCriterion()]),
    }))
  }

  const updateCriterion = (index: number, patch: Partial<NormalizedCompetitionRatingCriterion>) => {
    setFormData((prev) => ({
      ...prev,
      rating_criteria: prev.rating_criteria.map((criterion, criterionIndex) =>
        criterionIndex === index ? { ...criterion, ...patch } : criterion,
      ),
    }))
  }

  const removeCriterion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rating_criteria: rebalanceCriterionWeights(
        prev.rating_criteria.filter((_, criterionIndex) => criterionIndex !== index),
      ),
    }))
  }

  const rebalanceWeights = () => {
    setFormData((prev) => ({
      ...prev,
      rating_criteria: rebalanceCriterionWeights(prev.rating_criteria),
    }))
  }

  const handleSubmit = async () => {
    if (validationMessage) return

    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()

    const normalizedCriteria = normalizeRatingCriteria(formData.rating_criteria).map((criterion) => {
      const scaleMin = Number(criterion.scale_min) || 1
      const requestedMax = Number(criterion.scale_max) || scaleMin

      return {
        id: criterion.id || createCriterionId(),
        label: criterion.label.trim(),
        description: criterion.description?.trim() || null,
        scale_type: criterion.scale_type || "stars",
        scale_min: scaleMin,
        scale_max: Math.max(scaleMin, requestedMax),
        weight_percentage: Number(criterion.weight_percentage) || 0,
      }
    })

    const data = {
      title: formData.title,
      slug: formData.slug || null,
      description: formData.description || null,
      content_html: formData.content_html || null,
      location: formData.location || null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      registration_deadline: formData.registration_deadline || null,
      capacity: formData.capacity ? Number.parseInt(formData.capacity, 10) : null,
      prize: formData.prize || null,
      featured_image: formData.featured_image || null,
      featured_image_path: formData.featured_image_path || null,
      entry_label: formData.entry_label.trim() || "Entry",
      rating_criteria: normalizedCriteria,
      leaderboard_settings: {
        result_max: Number(formData.leaderboard_settings.result_max) || 100,
        scoring_method: formData.leaderboard_settings.scoring_method,
        minimum_ratings_threshold: Math.max(1, Number(formData.leaderboard_settings.minimum_ratings_threshold) || 1),
      },
      voter_validation_settings: normalizeCompetitionVoterValidationSettings(formData.voter_validation_settings),
      status: formData.status as Competition["status"],
      visibility: formData.visibility as Competition["visibility"],
      is_featured: formData.is_featured,
    }

    if (competition) {
      await supabase.from("competitions").update(data).eq("id", competition.id)
    } else {
      await supabase.from("competitions").insert(data)
    }

    setIsLoading(false)
    router.push("/dashboard/competetion")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push("/dashboard/competetion")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {competition ? "Edit Competetion" : "Create Competetion"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {competition
                  ? `Editing: ${competition.title}`
                  : "Configure entries, weighted guest criteria, and leaderboard rules"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {competition && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/competetion/${competition.id}/entries`)}
              >
                <ListChecks className="mr-2 h-4 w-4" />
                Manage Entries
              </Button>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="edit" className="gap-1.5 px-3 text-xs sm:text-sm">
                  <Edit3 className="h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5 px-3 text-xs sm:text-sm">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select
              value={formData.status}
              onValueChange={(value) => {
                const status = value as Competition["status"]
                const visibility = status === "published" ? "public" : "private"
                setFormData((prev) => ({ ...prev, status, visibility }))
              }}
            >
              <SelectTrigger size="sm" className="w-[7.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleSubmit} disabled={isLoading || !canSave || !!validationMessage} size="sm" className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {competition ? "Update" : "Create"}
            </Button>
          </div>
        </div>

        {validationMessage && (
          <div className="border-t border-border bg-destructive/10 px-4 py-3 text-sm text-destructive sm:px-6">
            {validationMessage}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        {activeTab === "edit" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Competetion Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Enter competition title"
                      className="text-lg"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="slug" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        URL Slug
                      </Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(event) => setFormData((prev) => ({ ...prev, slug: event.target.value }))}
                        placeholder="competetion-slug"
                      />
                      <p className="text-xs text-muted-foreground">/competitions/{formData.slug || "your-slug"}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                        placeholder="Online or on-site location"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Brief summary for the listing view"
                      rows={3}
                    />
                  </div>

                  <CompetitionImageUploadField
                    id="featured_image"
                    label="Featured Image"
                    imageUrl={formData.featured_image}
                    storagePath={formData.featured_image_path}
                    folder="competitions/featured"
                    hint="Upload a local image from your device. The public URL will be stored automatically."
                    onChange={({ imageUrl, storagePath }) =>
                      setFormData((prev) => ({
                        ...prev,
                        featured_image: imageUrl,
                        featured_image_path: storagePath,
                      }))
                    }
                    onClear={() =>
                      setFormData((prev) => ({
                        ...prev,
                        featured_image: "",
                        featured_image_path: "",
                      }))
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Content</CardTitle>
                  <CardDescription>Use the rich text editor for rules, structure, judging, and event context.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    value={formData.content_html}
                    onChange={(value) => setFormData((prev) => ({ ...prev, content_html: value }))}
                    placeholder="Describe the competition format, judging, timeline, and submission rules..."
                    minHeight="500px"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Guest Rating Setup
                  </CardTitle>
                  <CardDescription>
                    Define weighted guest criteria. Criterion weights must total 100%.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry_label">Entry Label</Label>
                    <Input
                      id="entry_label"
                      value={formData.entry_label}
                      onChange={(event) => setFormData((prev) => ({ ...prev, entry_label: event.target.value }))}
                      placeholder="Dish"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used on registration forms and entry listings. Examples: Dish, Project, Team, Artwork.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Criteria Weight Total</p>
                      <p className={`mt-1 text-xs ${hasValidWeights ? "text-muted-foreground" : "text-destructive"}`}>
                        {weightTotal}% of 100%
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={rebalanceWeights} disabled={formData.rating_criteria.length === 0}>
                      <Equal className="mr-2 h-4 w-4" />
                      Rebalance Equally
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formData.rating_criteria.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                        No rating criteria yet. Add at least one if guests should score entries.
                      </div>
                    ) : (
                      formData.rating_criteria.map((criterion, index) => (
                        <div key={criterion.id || index} className="rounded-xl border border-border p-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Criterion Label</Label>
                              <Input
                                value={criterion.label}
                                onChange={(event) => updateCriterion(index, { label: event.target.value })}
                                placeholder="Taste"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Rating Type</Label>
                              <Select
                                value={criterion.scale_type}
                                onValueChange={(value) =>
                                  updateCriterion(index, {
                                    scale_type: value as NormalizedCompetitionRatingCriterion["scale_type"],
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="stars">Stars</SelectItem>
                                  <SelectItem value="numeric">Numeric</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={criterion.description || ""}
                              onChange={(event) => updateCriterion(index, { description: event.target.value })}
                              placeholder="Optional guidance for guests"
                              rows={2}
                            />
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>Minimum Score</Label>
                              <Input
                                type="number"
                                min="0"
                                value={criterion.scale_min}
                                onChange={(event) =>
                                  updateCriterion(index, { scale_min: Number.parseInt(event.target.value || "0", 10) || 0 })
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Maximum Score</Label>
                              <Input
                                type="number"
                                min="1"
                                value={criterion.scale_max}
                                onChange={(event) =>
                                  updateCriterion(index, { scale_max: Number.parseInt(event.target.value || "1", 10) || 1 })
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Weight %</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={criterion.weight_percentage}
                                onChange={(event) =>
                                  updateCriterion(index, {
                                    weight_percentage: Number.parseFloat(event.target.value || "0") || 0,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => removeCriterion(index)}>
                              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                              Remove Criterion
                            </Button>
                          </div>
                        </div>
                      ))
                    )}

                    <Button variant="secondary" onClick={addCriterion}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Rating Criterion
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(event) => setFormData((prev) => ({ ...prev, start_date: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(event) => setFormData((prev) => ({ ...prev, end_date: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registration_deadline">Registration Deadline</Label>
                    <Input
                      id="registration_deadline"
                      type="datetime-local"
                      value={formData.registration_deadline}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, registration_deadline: event.target.value }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(event) => setFormData((prev) => ({ ...prev, capacity: event.target.value }))}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prize">Prize</Label>
                    <Input
                      id="prize"
                      value={formData.prize}
                      onChange={(event) => setFormData((prev) => ({ ...prev, prize: event.target.value }))}
                      placeholder="e.g. $5,000 grant"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sigma className="h-5 w-5" />
                    Leaderboard Settings
                  </CardTitle>
                  <CardDescription>
                    Convert weighted criteria into a final score and choose the leaderboard ranking formula.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="result_max">Final Result Max</Label>
                    <Input
                      id="result_max"
                      type="number"
                      min="1"
                      value={formData.leaderboard_settings.result_max}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          leaderboard_settings: {
                            ...prev.leaderboard_settings,
                            result_max: Number.parseFloat(event.target.value || "0") || 0,
                          },
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Example: with three equal criteria rated out of 5, set this to 100 to normalize leaderboard scores to 100.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scoring_method">Leaderboard Method</Label>
                    <Select
                      value={formData.leaderboard_settings.scoring_method}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          leaderboard_settings: {
                            ...prev.leaderboard_settings,
                            scoring_method: value as CompetitionLeaderboardMethod,
                          },
                        }))
                      }
                    >
                      <SelectTrigger id="scoring_method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="average">Average Score</SelectItem>
                        <SelectItem value="behzod_formula">Behzod&apos;s Formula</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimum_ratings_threshold">Minimum Ratings Threshold (m)</Label>
                    <Input
                      id="minimum_ratings_threshold"
                      type="number"
                      min="1"
                      value={formData.leaderboard_settings.minimum_ratings_threshold}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          leaderboard_settings: {
                            ...prev.leaderboard_settings,
                            minimum_ratings_threshold: Math.max(1, Number.parseInt(event.target.value || "1", 10) || 1),
                          },
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Entries need at least this many ratings to place, and the same value is used as m in
                      Behzod&apos;s Formula: Adjusted Score = (v / (v + m)) × R + (m / (v + m)) × C.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Vote Integrity
                  </CardTitle>
                  <CardDescription>
                    Limit each entry to one rating per email, and optionally require the email to exist in a linked
                    registration form.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-border px-4 py-3">
                    <p className="text-sm font-medium text-foreground">Duplicate protection</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Each email address can rate the same {formData.entry_label.toLowerCase() || "entry"} only once.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rating_identity_field">Rating Identity Field</Label>
                    <Select
                      value={formData.voter_validation_settings.rating_identity_field}
                      onValueChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          voter_validation_settings: {
                            ...prev.voter_validation_settings,
                            rating_identity_field: "guest_email",
                          },
                        }))
                      }
                    >
                      <SelectTrigger id="rating_identity_field">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guest_email">Rating Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eligibility_form_id">Linked Registration Form</Label>
                    <Select
                      value={formData.voter_validation_settings.eligibility_form_id || "none"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          voter_validation_settings: {
                            ...prev.voter_validation_settings,
                            eligibility_form_id: value === "none" ? null : value,
                            eligibility_form_field_key: null,
                          },
                        }))
                      }
                    >
                      <SelectTrigger id="eligibility_form_id">
                        <SelectValue placeholder="Optional: require a matching form submission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No linked form</SelectItem>
                        {forms.map((form) => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.title}
                            {form.is_active ? "" : " (Inactive)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      When selected, the voter email must match a submission in the chosen form.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eligibility_form_field_key">Registration Form Field</Label>
                    <Select
                      value={formData.voter_validation_settings.eligibility_form_field_key || "none"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          voter_validation_settings: {
                            ...prev.voter_validation_settings,
                            eligibility_form_field_key: value === "none" ? null : value,
                          },
                        }))
                      }
                      disabled={!selectedEligibilityForm}
                    >
                      <SelectTrigger id="eligibility_form_field_key">
                        <SelectValue
                          placeholder={
                            selectedEligibilityForm
                              ? "Choose the field to compare against rating email"
                              : "Choose a linked registration form first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No form field selected</SelectItem>
                        {comparableFormFields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label} ({field.key})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Recommended: choose the student email field from the registration form.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Visibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Featured competetion</p>
                      <p className="text-xs text-muted-foreground">Highlight this entry in future layouts.</p>
                    </div>
                    <Switch
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={formData.visibility}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, visibility: value as Competition["visibility"] }))
                      }
                    >
                      <SelectTrigger id="visibility">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            <Card className="overflow-hidden">
              {formData.featured_image && (
                <div
                  className="h-64 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${formData.featured_image})` }}
                />
              )}
              <CardContent className="space-y-6 p-8">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {formData.status}
                    </span>
                    {formData.is_featured && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                        Featured
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-foreground">{formData.title || "Competetion Title"}</h1>
                  <p className="text-base text-muted-foreground">
                    {formData.description || "A short description will appear here in preview mode."}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Start</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formData.start_date ? new Date(formData.start_date).toLocaleString("en-US") : "Not set"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Deadline</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formData.registration_deadline
                        ? new Date(formData.registration_deadline).toLocaleString("en-US")
                        : "Open"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Entry Type</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{formData.entry_label || "Entry"}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Leaderboard Max</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{formData.leaderboard_settings.result_max}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  {formData.content_html ? (
                    <ContentPreview content={formData.content_html} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Detailed competition content will appear here once you add it.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6">
                  <h2 className="text-xl font-semibold text-foreground">Guest Rating Criteria</h2>
                  {formData.rating_criteria.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No guest rating criteria configured yet.</p>
                  ) : (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {formData.rating_criteria.map((criterion) => (
                        <div key={criterion.id} className="rounded-xl border border-border bg-background p-4">
                          <p className="font-medium text-foreground">{criterion.label || "Untitled criterion"}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {criterion.description || "No description"}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {criterion.weight_percentage}% weight • {criterion.scale_type} {criterion.scale_min} to {criterion.scale_max}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6">
                  <h2 className="text-xl font-semibold text-foreground">Leaderboard Preview</h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Scores will be normalized to {formData.leaderboard_settings.result_max}. Ranking method:{" "}
                    {formData.leaderboard_settings.scoring_method === "behzod_formula"
                      ? "Behzod's Formula"
                      : "Average Score"}
                    .
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Entries need at least {formData.leaderboard_settings.minimum_ratings_threshold}{" "}
                    {formData.leaderboard_settings.minimum_ratings_threshold === 1 ? "rating" : "ratings"} to place on
                    the leaderboard.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Each email can rate the same {formData.entry_label.toLowerCase() || "entry"} only once.
                    {selectedEligibilityForm && formData.voter_validation_settings.eligibility_form_field_key
                      ? ` Voter email must also exist in ${selectedEligibilityForm.title} under ${formData.voter_validation_settings.eligibility_form_field_key}.`
                      : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import type React from "react"
import { useCallback, useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  ImageIcon,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  RemoveFormatting,
  Table,
  Youtube,
  Palette,
  Type,
  Maximize2,
  Minimize2,
  FileCode2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

const COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#b7b7b7",
  "#cccccc",
  "#d9d9d9",
  "#efefef",
  "#f3f3f3",
  "#ffffff",
  "#980000",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#4a86e8",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
  "#e6b8af",
  "#f4cccc",
  "#fce5cd",
  "#fff2cc",
  "#d9ead3",
  "#d0e0e3",
  "#c9daf8",
  "#cfe2f3",
  "#d9d2e9",
  "#ead1dc",
]

export function RichTextEditor({ value, onChange, placeholder, className, minHeight = "400px" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [imageWidth, setImageWidth] = useState("100")
  const [imageHeight, setImageHeight] = useState("auto")
  const [imageSizeUnit, setImageSizeUnit] = useState("%")
  const [videoUrl, setVideoUrl] = useState("")
  const [videoWidth, setVideoWidth] = useState("100")
  const [videoHeight, setVideoHeight] = useState("auto")
  const [videoSizeUnit, setVideoSizeUnit] = useState("%")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const initializedRef = useRef(false)
  const savedSelection = useRef<Range | null>(null)

  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = value
      initializedRef.current = true
    }
  }, [])

  useEffect(() => {
    if (editorRef.current && initializedRef.current) {
      if (document.activeElement !== editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value
      }
    }
  }, [value, isHtmlMode])

  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const saveSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelection.current = range
      }
    }
  }, [])

  const restoreSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && savedSelection.current) {
      selection.removeAllRanges()
      selection.addRange(savedSelection.current)
    }
  }, [])

  const execCommand = useCallback(
    (command: string, value?: string) => {
      restoreSelection()
      document.execCommand(command, false, value)
      editorRef.current?.focus()
      handleContentChange()
    },
    [handleContentChange, restoreSelection],
  )

  const insertLink = useCallback(() => {
    if (linkUrl) {
      execCommand("createLink", linkUrl)
      setLinkUrl("")
    }
  }, [linkUrl, execCommand])

  const insertImage = useCallback(() => {
    if (imageUrl) {
      const width = imageWidth === "auto" ? "auto" : `${imageWidth}${imageSizeUnit}`
      const height = imageHeight === "auto" ? "auto" : `${imageHeight}${imageSizeUnit}`
      const imgHtml = `<img src="${imageUrl}" style="width: ${width}; height: ${height}; display: block; margin: 1rem auto; border-radius: 0.5rem;" />`
      execCommand("insertHTML", imgHtml)
      setImageUrl("")
    }
  }, [imageUrl, imageWidth, imageHeight, imageSizeUnit, execCommand])

  const insertVideo = useCallback(() => {
    if (videoUrl) {
      const videoId = extractYouTubeId(videoUrl)
      if (videoId) {
        const width = videoWidth === "auto" ? "100%" : `${videoWidth}${videoSizeUnit}`
        const height = videoHeight === "auto" ? "0" : `${videoHeight}${videoSizeUnit}`
        
        // If height is auto/0, use 16:9 aspect ratio container
        if (videoHeight === "auto" || videoHeight === "0") {
          const iframe = `<div class="video-embed" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:${width};margin:1rem auto;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`
          execCommand("insertHTML", iframe)
        } else {
          const iframe = `<div class="video-embed" style="width:${width};height:${height};margin:1rem auto;"><iframe src="https://www.youtube.com/embed/${videoId}" style="width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`
          execCommand("insertHTML", iframe)
        }
      }
      setVideoUrl("")
    }
  }, [videoUrl, videoWidth, videoHeight, videoSizeUnit, execCommand])

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/)
    return match ? match[1] : null
  }

  const insertTable = useCallback(() => {
    const table = `
      <table style="width:100%;border-collapse:collapse;margin:1rem 0;">
        <tr>
          <th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">Header 1</th>
          <th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">Header 2</th>
          <th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">Header 3</th>
        </tr>
        <tr>
          <td style="border:1px solid #ddd;padding:8px;">Cell 1</td>
          <td style="border:1px solid #ddd;padding:8px;">Cell 2</td>
          <td style="border:1px solid #ddd;padding:8px;">Cell 3</td>
        </tr>
        <tr>
          <td style="border:1px solid #ddd;padding:8px;">Cell 4</td>
          <td style="border:1px solid #ddd;padding:8px;">Cell 5</td>
          <td style="border:1px solid #ddd;padding:8px;">Cell 6</td>
        </tr>
      </table>
    `
    execCommand("insertHTML", table)
  }, [execCommand])

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className={cn("h-8 w-8 p-0", active && "bg-accent")}
    >
      {children}
    </Button>
  )

  const ToolbarDivider = () => <div className="w-px h-6 bg-border mx-1" />

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden bg-background",
        isFullscreen && "fixed inset-4 z-50 flex flex-col",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="border-b bg-muted/30 p-2 flex flex-wrap items-center gap-1">
        {/* History */}
        <ToolbarButton onClick={() => execCommand("undo")} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("redo")} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton onClick={() => execCommand("formatBlock", "h1")} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("formatBlock", "h2")} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("formatBlock", "h3")} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text Formatting */}
        <ToolbarButton onClick={() => execCommand("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("underline")} title="Underline">
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("strikeThrough")} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Colors */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Text Color">
              <Type className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-10 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => execCommand("foreColor", color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Background Color">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-10 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => execCommand("hiliteColor", color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton onClick={() => execCommand("justifyLeft")} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("justifyCenter")} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("justifyRight")} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("justifyFull")} title="Justify">
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton onClick={() => execCommand("insertUnorderedList")} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("insertOrderedList")} title="Numbered List">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block Elements */}
        <ToolbarButton onClick={() => execCommand("formatBlock", "blockquote")} title="Quote">
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand("formatBlock", "pre")} title="Code Block">
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Insert Elements */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Link">
              <Link className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <p className="text-sm font-medium">Insert Link</p>
              <Input placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              <Button size="sm" onClick={insertLink} className="w-full">
                Insert
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Image">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <Tabs defaultValue="url">
              <TabsList className="w-full">
                <TabsTrigger value="url" className="flex-1">
                  URL
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex-1">
                  Upload
                </TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="space-y-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <div className="flex gap-2 items-center">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Width</p>
                    <Input
                      placeholder="100"
                      value={imageWidth}
                      onChange={(e) => setImageWidth(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Height</p>
                    <Input
                      placeholder="auto"
                      value={imageHeight}
                      onChange={(e) => setImageHeight(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="w-16 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Unit</p>
                    <Select value={imageSizeUnit} onValueChange={setImageSizeUnit}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="%">%</SelectItem>
                        <SelectItem value="px">px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button size="sm" onClick={insertImage} className="w-full">
                  Insert
                </Button>
              </TabsContent>
              <TabsContent value="upload" className="space-y-2">
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = () => {
                          if (reader.result) {
                            execCommand("insertImage", reader.result as string)
                          }
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-2">Click or drag to upload</p>
                </div>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Embed Video">
              <Youtube className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <p className="text-sm font-medium">Embed YouTube Video</p>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <div className="flex gap-2 items-center">
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Width</p>
                  <Input
                    placeholder="100"
                    value={videoWidth}
                    onChange={(e) => setVideoWidth(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Height</p>
                  <Input
                    placeholder="auto"
                    value={videoHeight}
                    onChange={(e) => setVideoHeight(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="w-16 space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Unit</p>
                  <Select value={videoSizeUnit} onValueChange={setVideoSizeUnit}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="%">%</SelectItem>
                      <SelectItem value="px">px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" onClick={insertVideo} className="w-full">
                Embed
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <ToolbarButton onClick={insertTable} title="Insert Table">
          <Table className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => execCommand("removeFormat")} title="Clear Formatting">
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => setIsHtmlMode(!isHtmlMode)} active={isHtmlMode} title="Source Code">
          <FileCode2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      {isHtmlMode ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "p-4 font-mono text-sm resize-none border-0 focus-visible:ring-0 rounded-none",
            isFullscreen ? "flex-1" : "",
          )}
          style={{ minHeight: isFullscreen ? "auto" : minHeight, height: isFullscreen ? "100%" : "auto" }}
          spellCheck={false}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          className={cn(
            "p-4 outline-none overflow-auto prose prose-sm max-w-none",
            "focus:ring-0 focus:outline-none",
            "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4",
            "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3",
            "[&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4",
            "[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto",
            "[&_ul]:list-disc [&_ul]:ml-6",
            "[&_ol]:list-decimal [&_ol]:ml-6",
            "[&_a]:text-primary [&_a]:underline",
            "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4",
            isFullscreen ? "flex-1" : "",
          )}
          style={{ minHeight: isFullscreen ? "auto" : minHeight }}
          onInput={handleContentChange}
          onBlur={() => {
            handleContentChange()
            saveSelection()
          }}
          data-placeholder={placeholder}
        />
      )}
    </div>
  )
}

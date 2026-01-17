"use client"

import { cn } from "@/lib/utils"

interface ContentPreviewProps {
  content: string
  className?: string
}

export function ContentPreview({ content, className }: ContentPreviewProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none",
        "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-foreground",
        "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-foreground",
        "[&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:text-foreground",
        "[&_p]:text-foreground [&_p]:mb-4",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4",
        "[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto",
        "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:text-foreground",
        "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:text-foreground",
        "[&_a]:text-primary [&_a]:underline",
        "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4",
        "[&_table]:w-full [&_table]:border-collapse",
        "[&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_th]:text-foreground",
        "[&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:text-foreground",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

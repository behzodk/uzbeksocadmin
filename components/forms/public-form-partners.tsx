import { ExternalLink, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FormPartner } from "@/lib/types"

function getPartnerUrlLabel(url: string) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "")
    return `${parsed.hostname.replace(/^www\./, "")}${path}`
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "")
  }
}

export function PublicFormPartners({
  partners,
  className,
}: {
  partners: FormPartner[]
  className?: string
}) {
  if (!partners.length) {
    return null
  }

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Globe className="h-4 w-4" />
        Featured Partners
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {partners.map((partner) => (
          <a
            key={partner.id}
            href={partner.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-4 rounded-xl border border-border bg-background/90 p-4 transition-colors hover:border-primary/40 hover:bg-background"
          >
            <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-muted/50 p-3">
              {partner.logo_url ? (
                <img src={partner.logo_url} alt={partner.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <Globe className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{partner.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{getPartnerUrlLabel(partner.url)}</p>
            </div>

            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </a>
        ))}
      </div>
    </div>
  )
}

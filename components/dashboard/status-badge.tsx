import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  variant?: "default" | "success" | "warning" | "danger" | "info"
}

const variantStyles = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

export function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
        variantStyles[variant],
      )}
    >
      {status}
    </span>
  )
}

export function getStatusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  switch (status.toLowerCase()) {
    case "active":
    case "published":
    case "sent":
    case "completed":
      return "success"
    case "pending":
    case "scheduled":
    case "draft":
      return "warning"
    case "inactive":
    case "cancelled":
      return "danger"
    default:
      return "default"
  }
}

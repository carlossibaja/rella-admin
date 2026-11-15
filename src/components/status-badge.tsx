import { Badge } from "@/components/ui/badge"
import type { OrganizationStatus } from "@/lib/api/organizations"
import { cn } from "@/lib/utils"

export const STATUS_LABELS: Record<OrganizationStatus, string> = {
  active: "Activa",
  expiring: "Por vencer",
  expired: "Vencida",
  none: "Sin plan",
}

const STATUS_STYLES: Record<OrganizationStatus, string> = {
  active: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  expiring: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  expired: "bg-red-500/12 text-red-700 dark:text-red-400",
  none: "bg-muted text-muted-foreground",
}

const DOT_STYLES: Record<OrganizationStatus, string> = {
  active: "bg-emerald-500",
  expiring: "bg-amber-500",
  expired: "bg-red-500",
  none: "bg-zinc-400",
}

export function StatusBadge({
  status,
  daysLeft,
  className,
}: {
  status: OrganizationStatus
  daysLeft?: number | null
  className?: string
}) {
  let label = STATUS_LABELS[status]
  if (status === "expiring" && daysLeft !== null && daysLeft !== undefined) {
    label += daysLeft <= 0 ? " · hoy" : ` · ${daysLeft} ${daysLeft === 1 ? "día" : "días"}`
  }
  return (
    <Badge className={cn("gap-1.5 border-transparent font-medium", STATUS_STYLES[status], className)}>
      <span className={cn("size-1.5 rounded-full", DOT_STYLES[status])} />
      {label}
    </Badge>
  )
}

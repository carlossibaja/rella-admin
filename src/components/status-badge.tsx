import { Badge } from "@/components/ui/badge"
import type { OrganizationStatusFilter } from "@/lib/api/organizations"
import { cn } from "@/lib/utils"

export const STATUS_LABELS: Record<OrganizationStatusFilter, string> = {
  active: "Activa",
  expiring: "Por vencer",
  expired: "Vencida",
  none: "Sin plan",
  deleted: "Eliminada",
}

const STATUS_STYLES: Record<OrganizationStatusFilter, string> = {
  active: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  expiring: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  expired: "bg-red-500/12 text-red-700 dark:text-red-400",
  none: "bg-muted text-muted-foreground",
  deleted: "bg-red-600 text-white dark:bg-red-500/80",
}

const DOT_STYLES: Record<OrganizationStatusFilter, string> = {
  active: "bg-emerald-500",
  expiring: "bg-amber-500",
  expired: "bg-red-500",
  none: "bg-zinc-400",
  deleted: "bg-white",
}

/** Effective status of an organization: a soft-deleted one is "deleted" whatever its plan. */
export function organizationStatus(org: {
  status: OrganizationStatusFilter
  deleted_at?: string | null
}): OrganizationStatusFilter {
  return org.deleted_at ? "deleted" : org.status
}

export function StatusBadge({
  status,
  daysLeft,
  className,
}: {
  status: OrganizationStatusFilter
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

const EMAIL_STATUS: Record<string, { label: string; className: string }> = {
  queued: { label: "En cola", className: "bg-muted text-muted-foreground" },
  sent: { label: "Enviado", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  delivered: { label: "Entregado", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  delayed: { label: "Retrasado", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  bounced: { label: "Rebotó", className: "bg-red-500/12 text-red-700 dark:text-red-400" },
  complained: { label: "Marcado como spam", className: "bg-red-500/12 text-red-700 dark:text-red-400" },
  failed: { label: "Falló", className: "bg-red-500/12 text-red-700 dark:text-red-400" },
}

/** Delivery status of a staff email; unknown values are shown as plain text. */
export function EmailStatusBadge({ status, className }: { status: string; className?: string }) {
  const known = EMAIL_STATUS[status]
  if (!known) return <span className={cn("text-sm", className)}>{status}</span>
  return (
    <Badge className={cn("border-transparent font-medium", known.className, className)}>
      {known.label}
    </Badge>
  )
}

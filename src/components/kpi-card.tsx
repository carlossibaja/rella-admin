import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPct } from "@/lib/format"
import { cn } from "@/lib/utils"

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  change,
  loading,
}: {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  hint?: React.ReactNode
  /** Percentage change; renders a trend pill when provided. */
  change?: number | null
  loading?: boolean
}) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex flex-col gap-3 px-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        )}
        <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {change !== undefined && !loading ? <TrendPill value={change} /> : null}
          {loading ? <Skeleton className="h-4 w-24" /> : hint}
        </div>
      </CardContent>
    </Card>
  )
}

export function TrendPill({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="rounded-full bg-muted px-2 py-0.5 font-medium">—</span>
  }
  const up = value >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium",
        up
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-red-500/10 text-red-700 dark:text-red-400"
      )}
    >
      <Icon className="size-3" />
      {formatPct(value, true)}
    </span>
  )
}

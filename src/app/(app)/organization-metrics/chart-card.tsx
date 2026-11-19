"use client"

import type { ReactNode } from "react"
import { History, Info, type LucideIcon } from "lucide-react"
import type { LabelProps } from "recharts"

import { EmptyState } from "@/components/empty-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Above this many buckets, value labels would collide; the tooltip carries the numbers instead. */
export const MAX_LABELED_POINTS = 14

/** Shared look of every value label drawn on a mark: small, muted ink, tabular digits. */
export const VALUE_LABEL_PROPS = {
  className: "fill-foreground tabular-nums",
  fontSize: 11,
  fontWeight: 500,
} as const

/** LabelList formatter: the count, or nothing for 0 so empty buckets stay clean. */
export function countOrBlank(value: unknown) {
  return typeof value === "number" && value !== 0 ? formatNumber(value) : ""
}

/** LabelList formatter for nullable counts: blank for null (a gap, never 0), otherwise the count. */
export function countOrGap(value: unknown) {
  return typeof value === "number" ? formatNumber(value) : ""
}

/** Subtle note about how far the subscription history goes back; renders nothing without text. */
export function HistoryNote({ text, className }: { text: string | null; className?: string }) {
  if (!text) return null
  return (
    <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <History className="size-3.5 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  )
}

/** Small "i" icon that reveals a metric definition on hover or focus. */
export function InfoHint({ text, label = "Definición" }: { text: string; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-72 leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

/** Card with a titled header, a definition tooltip and a fixed-height body for a chart. */
export function ChartCard({
  title,
  help,
  description,
  loading,
  empty,
  emptyTitle,
  emptyIcon,
  note,
  className,
  children,
}: {
  title: string
  help: string
  description?: string
  /** Subtle line under the description, e.g. a history coverage note. */
  note?: string | null
  loading: boolean
  empty: boolean
  emptyTitle: string
  emptyIcon: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          {title}
          <InfoHint text={help} label={`Definición: ${title}`} />
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        <HistoryNote text={note ?? null} />
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : empty ? (
          <EmptyState className="h-64" icon={emptyIcon} title={emptyTitle} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

/** Compact number tile with a definition tooltip. */
export function StatTile({
  label,
  help,
  value,
  hint,
  loading,
  muted,
}: {
  label: string
  help: string
  value: ReactNode
  hint?: ReactNode
  loading: boolean
  /** Renders the value as secondary text (e.g. "Sin datos"). */
  muted?: boolean
}) {
  return (
    <Card className="gap-1.5 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground">
        <span className="truncate">{label}</span>
        <InfoHint text={help} label={`Definición: ${label}`} />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <span
          className={cn(
            "tabular-nums",
            muted ? "text-sm font-medium text-muted-foreground" : "text-2xl font-semibold tracking-tight"
          )}
        >
          {value}
        </span>
      )}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Card>
  )
}

/** Legend row for donut charts: swatch, label, count and share of the whole. */
export function LegendRow({
  color,
  label,
  value,
  total,
}: {
  color: string
  label: string
  value: number
  total: number
}) {
  const share = total ? Math.round((value / total) * 100) : 0
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: color }} aria-hidden />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium tabular-nums">{formatNumber(value)}</span>
      <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{share} %</span>
    </li>
  )
}

/**
 * Value drawn inside a stacked bar segment. Skipped for 0 and for segments too short to hold the
 * text; the stack total on top and the tooltip still carry those numbers.
 */
export function SegmentLabel(props: LabelProps) {
  const { viewBox, value } = props
  if (typeof value !== "number" || value === 0 || !viewBox || !("width" in viewBox)) return null
  const { x = 0, y = 0, width = 0, height = 0 } = viewBox as { x?: number; y?: number; width?: number; height?: number }
  if (Math.abs(height) < 16 || width < 18) return null
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
      // Every chart fill is mid-to-light in both themes, so dark ink stays legible on all of them.
      fill="oklch(0.21 0.006 285.885)"
      className="tabular-nums"
    >
      {formatNumber(value)}
    </text>
  )
}

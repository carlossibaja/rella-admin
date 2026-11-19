"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Building2 } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { tooltipFormatter } from "@/components/money-tooltip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import type { GroupBy, OrganizationMetricsPoint } from "@/lib/api/metrics"
import { addDays, currentMonth, formatPeriod, todayLocal } from "@/lib/format"

import { EVENT_LABELS } from "./definitions"

const createdDeletedConfig = {
  created: { label: EVENT_LABELS.created, color: "var(--chart-2)" },
  deleted: { label: EVENT_LABELS.deleted, color: "var(--chart-4)" },
} satisfies ChartConfig

const CREATED_DELETED_METRICS = ["created", "deleted"] as const

const createdDeletedTooltip = tooltipFormatter(createdDeletedConfig, "count")

/** Whether the bucket starting at `period` contains today (Bogota), i.e. it is still in progress. */
function isCurrentPeriod(period: string, groupBy: GroupBy) {
  const today = todayLocal()
  if (groupBy === "month") return period === currentMonth()
  if (groupBy === "week") return period <= today && today <= addDays(period, 6)
  return period === today
}

/** Period label; the in-progress bucket is flagged as partial. */
function periodLabel(period: string, groupBy: GroupBy) {
  const label = formatPeriod(period, groupBy)
  return isCurrentPeriod(period, groupBy) ? `${label} (en curso)` : label
}

/**
 * Line charts over the page's range. Laid out as a 2-column grid on lg so a second chart can sit
 * next to the first one.
 */
export function TrendCharts({
  series,
  groupBy,
  loading,
}: {
  series: OrganizationMetricsPoint[]
  groupBy: GroupBy
  loading: boolean
}) {
  const hasEvents = series.some((point) => point.created > 0 || point.deleted > 0)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Creadas vs. eliminadas</CardTitle>
          <CardDescription>Empresas creadas y eliminadas por periodo; el periodo actual está en curso</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full rounded-lg" />
          ) : !hasEvents ? (
            <EmptyState className="h-72" icon={Building2} title="Sin creadas ni eliminadas en este periodo" />
          ) : (
            <ChartContainer config={createdDeletedConfig} className="aspect-auto h-72 w-full">
              <LineChart data={series} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={16}
                  tickFormatter={(value: string) => formatPeriod(value, groupBy)}
                />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => periodLabel(String(value), groupBy)}
                      formatter={createdDeletedTooltip}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {CREATED_DELETED_METRICS.map((metric) => (
                  <Line
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    stroke={`var(--color-${metric})`}
                    strokeWidth={2}
                    dot={{ r: 3, fill: `var(--color-${metric})` }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/*
        Second chart slot: "Activas vs. no renovaron" (per-period `active` vs. `not_renewed`).
        Add it here as a sibling Card once the API exposes those fields on each series point.
      */}
    </div>
  )
}

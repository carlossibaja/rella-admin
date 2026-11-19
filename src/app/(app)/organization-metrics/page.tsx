"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  BadgeCheck,
  Ban,
  Building2,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  CreditCard,
  FlaskConical,
  Hourglass,
  Percent,
  Trash2,
  UserPlus,
} from "lucide-react"
import useSWR from "swr"

import { EmptyState, ErrorState } from "@/components/empty-state"
import { KpiCard } from "@/components/kpi-card"
import { tooltipFormatter } from "@/components/money-tooltip"
import { PageHeader } from "@/components/page-header"
import { DateField, GroupBySelect } from "@/components/range-filters"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { errorMessage } from "@/lib/api/client"
import { organizationMetricsKey, type GroupBy, type OrganizationMetrics } from "@/lib/api/metrics"
import { addMonths, currentMonth, formatNumber, formatPeriod, todayLocal } from "@/lib/format"

import { EVENT_HELP, EVENT_LABELS, conversionRate, formatRate, type EventMetric } from "./definitions"
import { TrendCharts } from "./trend-charts"

/** Default range: the current month and the 2 before it (a quarter), through today. */
const DEFAULT_RANGE_MONTHS = 3

/** Series drawn in the chart; `churned_payment` is excluded while it is always null. */
const CHART_METRICS = [
  "created",
  "converted",
  "cancelled",
  "deleted",
  "trial_expired_unconverted",
] as const satisfies readonly EventMetric[]

const chartConfig = {
  created: { label: EVENT_LABELS.created, color: "var(--chart-1)" },
  converted: { label: EVENT_LABELS.converted, color: "var(--chart-2)" },
  cancelled: { label: EVENT_LABELS.cancelled, color: "var(--chart-3)" },
  deleted: { label: EVENT_LABELS.deleted, color: "var(--chart-4)" },
  trial_expired_unconverted: { label: EVENT_LABELS.trial_expired_unconverted, color: "var(--chart-5)" },
} satisfies ChartConfig

const countTooltip = tooltipFormatter(chartConfig, "count")

const UNAVAILABLE_HINT = "Sin historial de suspensiones"

/** Renders a nullable count; null means the metric is not tracked yet, never 0. */
function nullableCount(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : formatNumber(value)
}

export default function OrganizationMetricsPage() {
  const [from, setFrom] = useState(() => `${addMonths(currentMonth(), -(DEFAULT_RANGE_MONTHS - 1))}-01`)
  const [to, setTo] = useState(todayLocal)
  const [groupBy, setGroupBy] = useState<GroupBy>("month")

  const { data, error, isLoading, mutate } = useSWR<OrganizationMetrics>(
    organizationMetricsKey({ from, to, group_by: groupBy })
  )
  const loading = isLoading && !data
  const series = data?.series ?? []
  const snapshot = data?.snapshot
  const totals = data?.totals
  const hasEvents = series.some((point) => CHART_METRICS.some((metric) => point[metric] > 0))
  const churnedTotal = totals?.churned_payment ?? null

  return (
    <>
      <PageHeader
        title="Métricas de organizaciones"
        description="Ciclo de vida de las empresas: creación, conversión a pago, cancelación y bajas."
      />

      <Card className="py-4">
        <CardContent className="grid gap-3 px-4 sm:grid-cols-3">
          <DateField id="from" label="Desde" value={from} max={to} onChange={setFrom} />
          <DateField id="to" label="Hasta" value={to} min={from} onChange={setTo} />
          <GroupBySelect value={groupBy} onChange={setGroupBy} />
        </CardContent>
      </Card>

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void mutate()} />
      ) : (
        <>
          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Estado actual</h2>
              <p className="text-sm text-muted-foreground">
                Foto de hoy, no depende del rango. Activas, por vencer, vencidas y sin plan suman el total.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard label="Total" icon={Building2} loading={loading} value={formatNumber(snapshot?.total)} />
              <KpiCard label="Activas" icon={CircleCheck} loading={loading} value={formatNumber(snapshot?.active)} />
              <KpiCard label="Por vencer" icon={Clock} loading={loading} value={formatNumber(snapshot?.expiring)} />
              <KpiCard label="Vencidas" icon={CircleX} loading={loading} value={formatNumber(snapshot?.expired)} />
              <KpiCard label="Sin plan" icon={CircleDashed} loading={loading} value={formatNumber(snapshot?.none)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiCard
                label="En prueba"
                icon={FlaskConical}
                loading={loading}
                value={formatNumber(snapshot?.trialing)}
                hint="Se solapa con activas y por vencer; no suma al total"
              />
              <KpiCard
                label="Eliminadas, pendientes de purga"
                icon={Trash2}
                loading={loading}
                value={formatNumber(snapshot?.deleted)}
                hint="No incluidas en el total"
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">En el rango</h2>
              <p className="text-sm text-muted-foreground">Eventos ocurridos entre las fechas seleccionadas.</p>
            </div>
            <TrendCharts series={series} groupBy={data?.group_by ?? groupBy} loading={loading} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label={EVENT_LABELS.created}
                icon={UserPlus}
                loading={loading}
                value={formatNumber(totals?.created)}
                hint="Incluye las eliminadas después"
              />
              <KpiCard
                label={EVENT_LABELS.converted}
                icon={BadgeCheck}
                loading={loading}
                value={formatNumber(totals?.converted)}
                hint="Primer pago aprobado"
              />
              <KpiCard
                label={EVENT_LABELS.cancelled}
                icon={Ban}
                loading={loading}
                value={formatNumber(totals?.cancelled)}
                hint="Sin contar renovación apagada"
              />
              <KpiCard
                label={EVENT_LABELS.deleted}
                icon={Trash2}
                loading={loading}
                value={formatNumber(totals?.deleted)}
              />
              <KpiCard
                label={EVENT_LABELS.trial_expired_unconverted}
                icon={Hourglass}
                loading={loading}
                value={formatNumber(totals?.trial_expired_unconverted)}
                hint="Evaluado a hoy"
              />
              <KpiCard
                label={EVENT_LABELS.churned_payment}
                icon={CreditCard}
                loading={loading}
                value={
                  churnedTotal === null ? (
                    <span className="text-base font-medium text-muted-foreground">No disponible</span>
                  ) : (
                    formatNumber(churnedTotal)
                  )
                }
                hint={churnedTotal === null ? UNAVAILABLE_HINT : undefined}
              />
              <KpiCard
                label="Tasa de conversión"
                icon={Percent}
                loading={loading}
                value={formatRate(totals?.conversion_rate_pct)}
                hint="Convertidas ÷ (convertidas + prueba vencida)"
              />
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Eventos por periodo</CardTitle>
              <CardDescription>Caídas por falta de pago no se grafica: aún no hay datos</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full rounded-lg" />
              ) : !data || !hasEvents ? (
                <EmptyState className="h-72" icon={Building2} title="Sin eventos en este periodo" />
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
                  <BarChart data={series} margin={{ left: 4, right: 4 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={20}
                      tickFormatter={(value: string) => formatPeriod(value, data.group_by)}
                    />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => formatPeriod(String(value), data.group_by)}
                          formatter={countTooltip}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    {CHART_METRICS.map((metric) => (
                      <Bar key={metric} dataKey={metric} fill={`var(--color-${metric})`} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Periodo</TableHead>
                  <TableHead className="text-right">{EVENT_LABELS.created}</TableHead>
                  <TableHead className="text-right">{EVENT_LABELS.converted}</TableHead>
                  <TableHead className="text-right">{EVENT_LABELS.cancelled}</TableHead>
                  <TableHead className="text-right">{EVENT_LABELS.deleted}</TableHead>
                  <TableHead className="text-right">{EVENT_LABELS.trial_expired_unconverted}</TableHead>
                  <TableHead className="text-right" title={UNAVAILABLE_HINT}>
                    {EVENT_LABELS.churned_payment}
                  </TableHead>
                  <TableHead className="pr-4 text-right">Conversión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8} className="px-4">
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : [...series].reverse().map((point) => (
                      <TableRow key={point.period}>
                        <TableCell className="pl-4">
                          {formatPeriod(point.period, data?.group_by ?? groupBy)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(point.created)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(point.converted)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(point.cancelled)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(point.deleted)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(point.trial_expired_unconverted)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {nullableCount(point.churned_payment)}
                        </TableCell>
                        <TableCell className="pr-4 text-right tabular-nums">
                          {formatRate(conversionRate(point))}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Definiciones</CardTitle>
              <CardDescription>Cómo se calcula cada métrica (zona horaria America/Bogota)</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {(Object.keys(EVENT_LABELS) as EventMetric[]).map((metric) => (
                  <div key={metric} className="space-y-0.5">
                    <dt className="font-medium">{EVENT_LABELS[metric]}</dt>
                    <dd className="text-muted-foreground">{EVENT_HELP[metric]}</dd>
                  </div>
                ))}
                <div className="space-y-0.5">
                  <dt className="font-medium">Tasa de conversión</dt>
                  <dd className="text-muted-foreground">{EVENT_HELP.conversion_rate_pct}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}

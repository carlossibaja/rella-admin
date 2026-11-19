"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"
import { Building2, TrendingUp, TrendingDown } from "lucide-react"

import { tooltipFormatter } from "@/components/money-tooltip"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { GroupBy, OrganizationMetricsPoint } from "@/lib/api/metrics"
import { formatPeriod } from "@/lib/format"

import {
  ChartCard,
  MAX_LABELED_POINTS,
  SegmentLabel,
  VALUE_LABEL_PROPS,
  countOrBlank,
} from "./chart-card"
import { CHART_HELP, EVENT_LABELS, formatSigned, periodLabel } from "./definitions"

type TrendProps = {
  series: OrganizationMetricsPoint[]
  groupBy: GroupBy
  loading: boolean
}

const CHART_CLASS = "aspect-auto h-64 w-full"

/** X axis shared by every trend chart: month/week/day labels from `formatPeriod`. */
function PeriodAxis({ groupBy }: { groupBy: GroupBy }) {
  return (
    <XAxis
      dataKey="period"
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      minTickGap={16}
      tickFormatter={(value: string) => formatPeriod(value, groupBy)}
    />
  )
}

/**
 * Y axis: hidden when every mark is direct-labeled (the labels carry the values), visible otherwise.
 * The padding leaves room for labels above the highest and below the lowest point.
 */
function ValueAxis({ labeled }: { labeled: boolean }) {
  return (
    <YAxis
      hide={labeled}
      tickLine={false}
      axisLine={false}
      allowDecimals={false}
      width={36}
      padding={labeled ? { top: 22, bottom: 18 } : { top: 8 }}
    />
  )
}

// --- Created vs. deleted (line) ---------------------------------------------------------------

const createdDeletedConfig = {
  created: { label: EVENT_LABELS.created, color: "var(--chart-2)" },
  deleted: { label: EVENT_LABELS.deleted, color: "var(--chart-4)" },
} satisfies ChartConfig

const createdDeletedTooltip = tooltipFormatter(createdDeletedConfig, "count")

export function CreatedDeletedChart({ series, groupBy, loading }: TrendProps) {
  const labeled = series.length <= MAX_LABELED_POINTS
  const empty = !series.some((point) => point.created > 0 || point.deleted > 0)

  return (
    <ChartCard
      title="Creadas vs. eliminadas"
      help={CHART_HELP.createdDeleted}
      description="Empresas creadas y eliminadas por periodo"
      loading={loading}
      empty={empty}
      emptyIcon={Building2}
      emptyTitle="Sin creadas ni eliminadas en este rango"
    >
      <ChartContainer config={createdDeletedConfig} className={CHART_CLASS}>
        <LineChart data={series} margin={{ left: 12, right: 12, top: 4 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <PeriodAxis groupBy={groupBy} />
          <ValueAxis labeled={labeled} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => periodLabel(String(value), groupBy)}
                formatter={createdDeletedTooltip}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="created"
            stroke="var(--color-created)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--color-created)", stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
          >
            {labeled ? (
              <LabelList dataKey="created" position="top" offset={10} formatter={countOrBlank} {...VALUE_LABEL_PROPS} />
            ) : null}
          </Line>
          <Line
            type="monotone"
            dataKey="deleted"
            stroke="var(--color-deleted)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--color-deleted)", stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
          >
            {labeled ? (
              <LabelList
                dataKey="deleted"
                position="bottom"
                offset={10}
                formatter={countOrBlank}
                {...VALUE_LABEL_PROPS}
              />
            ) : null}
          </Line>
        </LineChart>
      </ChartContainer>
    </ChartCard>
  )
}

// --- Cumulative net growth (area) -------------------------------------------------------------

const netGrowthConfig = {
  cumulative: { label: "Neto acumulado", color: "var(--chart-1)" },
} satisfies ChartConfig

type NetPoint = { period: string; net: number; cumulative: number }

export function NetGrowthChart({ series, groupBy, loading }: TrendProps) {
  const data = useMemo(
    () =>
      series.reduce<NetPoint[]>((points, point) => {
        const net = point.created - point.deleted
        const cumulative = (points.at(-1)?.cumulative ?? 0) + net
        return [...points, { period: point.period, net, cumulative }]
      }, []),
    [series]
  )
  const labeled = data.length <= MAX_LABELED_POINTS
  const empty = !series.some((point) => point.created > 0 || point.deleted > 0)
  const final = data.at(-1)?.cumulative ?? 0
  const crossesZero = data.some((point) => point.cumulative < 0)

  return (
    <ChartCard
      title="Crecimiento neto"
      help={CHART_HELP.netGrowth}
      description={`Creadas − eliminadas, acumulado: ${formatSigned(final)} en el rango`}
      loading={loading}
      empty={empty}
      emptyIcon={final < 0 ? TrendingDown : TrendingUp}
      emptyTitle="Sin movimiento en este rango"
    >
      <ChartContainer config={netGrowthConfig} className={CHART_CLASS}>
        <AreaChart data={data} margin={{ left: 12, right: 12, top: 4 }} accessibilityLayer>
          <defs>
            <linearGradient id="net-growth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-cumulative)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-cumulative)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <PeriodAxis groupBy={groupBy} />
          <ValueAxis labeled={labeled} />
          {crossesZero ? <ReferenceLine y={0} stroke="var(--border)" /> : null}
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => periodLabel(String(value), groupBy)}
                formatter={(value, _name, item) => {
                  const point = item.payload as NetPoint
                  return (
                    <div className="grid w-full min-w-44 gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-[2px]"
                          style={{ background: "var(--color-cumulative)" }}
                        />
                        <span className="text-muted-foreground">Neto acumulado</span>
                        <span className="ml-auto font-mono font-medium text-foreground tabular-nums">
                          {formatSigned(Number(value))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pl-4.5">
                        <span className="text-muted-foreground">En el periodo</span>
                        <span className="ml-auto font-mono text-foreground tabular-nums">
                          {formatSigned(point.net)}
                        </span>
                      </div>
                    </div>
                  )
                }}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="var(--color-cumulative)"
            strokeWidth={2}
            fill="url(#net-growth-fill)"
            dot={labeled ? { r: 3.5, fill: "var(--color-cumulative)", stroke: "var(--card)", strokeWidth: 2 } : false}
            activeDot={{ r: 5 }}
          >
            {labeled ? (
              <LabelList
                dataKey="cumulative"
                position="top"
                offset={10}
                formatter={(value: unknown) => formatSigned(Number(value))}
                {...VALUE_LABEL_PROPS}
              />
            ) : null}
          </Area>
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  )
}

// --- Losses per period (stacked bars) ---------------------------------------------------------

const LOSS_METRICS = ["cancelled", "trial_expired_unconverted", "deleted"] as const

const lossesConfig = {
  cancelled: { label: EVENT_LABELS.cancelled, color: "var(--chart-3)" },
  trial_expired_unconverted: { label: EVENT_LABELS.trial_expired_unconverted, color: "var(--chart-5)" },
  deleted: { label: EVENT_LABELS.deleted, color: "var(--chart-4)" },
} satisfies ChartConfig

const lossesTooltip = tooltipFormatter(lossesConfig, "count")

type LossPoint = OrganizationMetricsPoint & { losses: number }

export function LossesChart({ series, groupBy, loading }: TrendProps) {
  const data = useMemo<LossPoint[]>(
    () =>
      series.map((point) => ({
        ...point,
        losses: point.cancelled + point.trial_expired_unconverted + point.deleted,
      })),
    [series]
  )
  const labeled = data.length <= MAX_LABELED_POINTS
  const empty = !data.some((point) => point.losses > 0)

  return (
    <ChartCard
      title="Pérdidas por periodo"
      help={CHART_HELP.losses}
      description="Cancelaciones, pruebas vencidas sin pagar y eliminaciones"
      loading={loading}
      empty={empty}
      emptyIcon={TrendingDown}
      emptyTitle="Sin pérdidas en este rango"
    >
      <ChartContainer config={lossesConfig} className={CHART_CLASS}>
        <BarChart data={data} margin={{ left: 12, right: 12, top: 4 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <PeriodAxis groupBy={groupBy} />
          <YAxis
            hide={labeled}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
            padding={{ top: labeled ? 20 : 8 }}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => periodLabel(String(value), groupBy)}
                formatter={lossesTooltip}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {LOSS_METRICS.map((metric, index) => {
            const top = index === LOSS_METRICS.length - 1
            return (
              <Bar
                key={metric}
                dataKey={metric}
                stackId="losses"
                fill={`var(--color-${metric})`}
                stroke="var(--card)"
                strokeWidth={1}
                maxBarSize={56}
                radius={top ? [4, 4, 0, 0] : 0}
              >
                {labeled ? <LabelList dataKey={metric} content={SegmentLabel} /> : null}
                {labeled && top ? (
                  <LabelList dataKey="losses" position="top" offset={6} formatter={countOrBlank} {...VALUE_LABEL_PROPS} />
                ) : null}
              </Bar>
            )
          })}
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

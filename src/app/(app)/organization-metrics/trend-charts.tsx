"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"
import { Building2, History, TrendingUp, TrendingDown } from "lucide-react"

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
import { formatNumber, formatPeriod } from "@/lib/format"

import {
  ChartCard,
  MAX_LABELED_POINTS,
  SegmentLabel,
  VALUE_LABEL_PROPS,
  countOrBlank,
  countOrGap,
} from "./chart-card"
import {
  CHART_HELP,
  EVENT_LABELS,
  formatSigned,
  historyNoteText,
  periodLabel,
  type HistoryCoverage,
} from "./definitions"

type TrendProps = {
  series: OrganizationMetricsPoint[]
  groupBy: GroupBy
  loading: boolean
}

type HistoryTrendProps = TrendProps & { coverage: HistoryCoverage }

const CHART_CLASS = "aspect-auto h-64 w-full"

/** Tooltip row for counts that may be null: null reads "sin datos", never 0. */
function nullableCountTooltip(config: ChartConfig) {
  return function TooltipRow(value: unknown, name: unknown, item: { color?: string }) {
    const key = String(name)
    const label = config[key]?.label ?? key
    const missing = value === null || value === undefined
    return (
      <div className="flex w-full min-w-40 items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: item.color }} />
        <span className="text-muted-foreground">{label}</span>
        <span
          className={
            missing
              ? "ml-auto text-muted-foreground italic"
              : "ml-auto font-mono font-medium text-foreground tabular-nums"
          }
        >
          {missing ? "sin datos" : formatNumber(Number(value))}
        </span>
      </div>
    )
  }
}

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

/**
 * Loss events that do not overlap: cancelling and being suspended for non-payment are distinct
 * events, as are deletions and unpaid trial expiries. `not_renewed` is left out because it is the
 * outcome of several of these (it would double count them), and `renewal_stopped` because it is
 * a risk signal, not a loss yet. Stack order keeps indigo away from slate (CVD/normal separation).
 */
const LOSS_METRICS = ["cancelled", "churned_payment", "deleted", "trial_expired_unconverted"] as const

const lossesConfig = {
  cancelled: { label: EVENT_LABELS.cancelled, color: "var(--chart-3)" },
  churned_payment: { label: EVENT_LABELS.churned_payment, color: "var(--chart-1)" },
  deleted: { label: EVENT_LABELS.deleted, color: "var(--chart-4)" },
  trial_expired_unconverted: { label: EVENT_LABELS.trial_expired_unconverted, color: "var(--chart-5)" },
} satisfies ChartConfig

const lossesTooltip = nullableCountTooltip(lossesConfig)

type LossPoint = OrganizationMetricsPoint & { losses: number }

export function LossesChart({ series, groupBy, loading, coverage }: HistoryTrendProps) {
  const data = useMemo<LossPoint[]>(
    () =>
      series.map((point) => ({
        ...point,
        // A null segment (no history) is omitted from the stack and adds nothing to the total.
        losses: LOSS_METRICS.reduce((sum, metric) => sum + (point[metric] ?? 0), 0),
      })),
    [series]
  )
  const labeled = data.length <= MAX_LABELED_POINTS
  const empty = !data.some((point) => point.losses > 0)

  return (
    <ChartCard
      title="Pérdidas por periodo"
      help={CHART_HELP.losses}
      description="Cancelaciones, caídas por falta de pago, eliminaciones y pruebas vencidas sin pagar"
      note={historyNoteText(coverage)}
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
            filterNull={false}
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

// --- Active vs. not renewed (line + bars) -----------------------------------------------------

const activeNotRenewedConfig = {
  active: { label: EVENT_LABELS.active, color: "var(--chart-2)" },
  not_renewed: { label: EVENT_LABELS.not_renewed, color: "var(--chart-4)" },
} satisfies ChartConfig

const activeNotRenewedTooltip = nullableCountTooltip(activeNotRenewedConfig)

/**
 * Point-in-time active organizations (line) against paid periods that were not renewed (bars).
 * Buckets without history are gaps: no point, no bar, no label (null is never drawn as 0).
 * Line vs. bar is the secondary encoding for the green/red pair, which is weak under deutan CVD.
 */
export function ActiveNotRenewedChart({ series, groupBy, loading, coverage, className }: HistoryTrendProps & {
  className?: string
}) {
  const labeled = series.length <= MAX_LABELED_POINTS
  const noHistory = coverage.kind === "none"
  const empty = noHistory || series.every((point) => point.active === null && point.not_renewed === null)

  return (
    <ChartCard
      className={className}
      title="Activas vs. no renovaron"
      help={CHART_HELP.activeNotRenewed}
      description="Empresas activas al cierre de cada periodo y periodos pagos que no se renovaron"
      note={noHistory ? null : historyNoteText(coverage)}
      loading={loading}
      empty={empty}
      emptyIcon={History}
      emptyTitle={noHistory ? "Sin historial todavía" : "Sin datos de historial en este rango"}
    >
      <ChartContainer config={activeNotRenewedConfig} className={CHART_CLASS}>
        <ComposedChart data={series} margin={{ left: 12, right: 12, top: 4 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <PeriodAxis groupBy={groupBy} />
          <YAxis
            hide={labeled}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
            padding={{ top: labeled ? 22 : 8 }}
          />
          <ChartTooltip
            filterNull={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => periodLabel(String(value), groupBy)}
                formatter={activeNotRenewedTooltip}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="not_renewed" fill="var(--color-not_renewed)" maxBarSize={40} radius={[4, 4, 0, 0]}>
            {labeled ? (
              <LabelList
                dataKey="not_renewed"
                position="top"
                offset={6}
                formatter={countOrGap}
                {...VALUE_LABEL_PROPS}
              />
            ) : null}
          </Bar>
          <Line
            type="monotone"
            dataKey="active"
            stroke="var(--color-active)"
            strokeWidth={2}
            connectNulls={false}
            dot={{ r: 4, fill: "var(--color-active)", stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
          >
            {labeled ? (
              <LabelList dataKey="active" position="top" offset={10} formatter={countOrGap} {...VALUE_LABEL_PROPS} />
            ) : null}
          </Line>
        </ComposedChart>
      </ChartContainer>
    </ChartCard>
  )
}

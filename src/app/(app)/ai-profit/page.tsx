"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bot,
  Coins,
  Gift,
  Percent,
  PhoneCall,
  Receipt,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"

import { EmptyState, ErrorState } from "@/components/empty-state"
import { KpiCard } from "@/components/kpi-card"
import { tooltipFormatter } from "@/components/money-tooltip"
import { PageHeader } from "@/components/page-header"
import { DateField } from "@/components/range-filters"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { errorMessage } from "@/lib/api/client"
import { aiProfitKey, type AiProfit, type AiProfitGroupBy, type AiProfitRow } from "@/lib/api/metrics"
import {
  addDays,
  centsToPesos,
  formatCOPCompact,
  formatCents,
  formatDay,
  formatNumber,
  formatPct,
  todayLocal,
} from "@/lib/format"
import { cn } from "@/lib/utils"

const GROUP_LABELS: Record<AiProfitGroupBy, string> = {
  day: "Por día",
  organization: "Por empresa",
  model: "Por modelo",
  concept: "Por concepto",
}

const COLUMN_LABELS: Record<AiProfitGroupBy, string> = {
  day: "Día",
  organization: "Empresa",
  model: "Modelo",
  concept: "Concepto",
}

const chartConfig = {
  charged: { label: "Cobrado", color: "var(--chart-1)" },
  cost: { label: "Costo proveedor", color: "var(--chart-3)" },
  profit: { label: "Ganancia", color: "var(--foreground)" },
} satisfies ChartConfig

const moneyTooltip = tooltipFormatter(chartConfig)

type ProfitSort = "none" | "desc" | "asc"

function rowKey(row: AiProfitRow, groupBy: AiProfitGroupBy, index: number) {
  if (groupBy === "day") return row.date ?? String(index)
  if (groupBy === "organization") return String(row.organization_id ?? index)
  if (groupBy === "model") return row.model ?? `none-${index}`
  return row.concept ?? `none-${index}`
}

function RowLabel({ row, groupBy }: { row: AiProfitRow; groupBy: AiProfitGroupBy }) {
  if (groupBy === "day") {
    return <span className="capitalize">{row.date ? formatDay(row.date, { weekday: "short", day: "numeric", month: "short" }) : "—"}</span>
  }
  if (groupBy === "organization") {
    const name = row.organization_name || `Empresa #${row.organization_id ?? "?"}`
    return row.organization_id ? (
      <Link href={`/organizations/${row.organization_id}`} className="font-medium hover:underline">
        {name}
      </Link>
    ) : (
      <span className="text-muted-foreground">{name}</span>
    )
  }
  if (groupBy === "model") {
    return row.model ? (
      <span className="font-mono text-xs">{row.model}</span>
    ) : (
      <span className="text-muted-foreground">Sin modelo</span>
    )
  }
  return row.label || row.concept ? (
    <span>{row.label || row.concept}</span>
  ) : (
    <span className="text-muted-foreground">Sin concepto</span>
  )
}

function MarginBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <Badge className="border-transparent bg-muted font-medium text-muted-foreground">—</Badge>
  }
  const tone =
    value >= 50
      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
      : value >= 20
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "bg-red-500/12 text-red-700 dark:text-red-400"
  return <Badge className={cn("border-transparent font-medium tabular-nums", tone)}>{formatPct(value)}</Badge>
}

export default function AiProfitPage() {
  const [to, setTo] = useState(todayLocal)
  const [from, setFrom] = useState(() => addDays(todayLocal(), -29))
  const [groupBy, setGroupBy] = useState<AiProfitGroupBy>("day")
  const [sort, setSort] = useState<ProfitSort>("none")

  const { data, error, isLoading, mutate } = useSWR<AiProfit>(
    aiProfitKey({ from, to, group_by: groupBy }),
    { onError: (err) => toast.error(errorMessage(err)) }
  )
  const loading = isLoading && !data
  const totals = data?.totals
  // keepPreviousData may still hold rows of another grouping while the new one loads
  const shownGroup = data?.group_by ?? groupBy
  const stale = !!data && data.group_by !== groupBy

  const rows = useMemo(() => {
    const list = [...(data?.rows ?? [])]
    if (sort !== "none") {
      list.sort((a, b) =>
        sort === "desc" ? b.profit_in_cents - a.profit_in_cents : a.profit_in_cents - b.profit_in_cents
      )
    } else if (shownGroup === "day") {
      list.reverse()
    }
    return list
  }, [data?.rows, sort, shownGroup])

  const chartData = useMemo(
    () =>
      (data?.group_by === "day" ? data.rows : []).map((row) => ({
        date: row.date ?? "",
        charged: centsToPesos(row.charged_in_cents),
        cost: centsToPesos(row.provider_cost_in_cents),
        profit: centsToPesos(row.profit_in_cents),
      })),
    [data]
  )

  const nextSort = () => setSort((current) => (current === "desc" ? "asc" : current === "asc" ? "none" : "desc"))
  const SortIcon = sort === "desc" ? ArrowDown : sort === "asc" ? ArrowUp : ArrowUpDown

  return (
    <>
      <PageHeader
        title="Ganancia IA"
        description="Lo cobrado por consumos de IA frente al costo del proveedor, en todas las empresas."
      />

      <Card className="py-4">
        <CardContent className="grid gap-3 px-4 sm:grid-cols-3 lg:max-w-2xl">
          <DateField id="from" label="Desde" value={from} max={to} onChange={setFrom} />
          <DateField id="to" label="Hasta" value={to} min={from} onChange={setTo} />
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Agrupar</Label>
            <Select
              value={groupBy}
              onValueChange={(next) => {
                setGroupBy(next as AiProfitGroupBy)
                setSort("none")
              }}
            >
              <SelectTrigger className="w-full" aria-label="Agrupar">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GROUP_LABELS) as AiProfitGroupBy[]).map((group) => (
                  <SelectItem key={group} value={group}>
                    {GROUP_LABELS[group]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void mutate()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard label="Cobrado" icon={Receipt} loading={loading} value={formatCents(totals?.charged_in_cents)} />
            <KpiCard
              label="Costo proveedor"
              icon={Coins}
              loading={loading}
              value={formatCents(totals?.provider_cost_in_cents)}
              hint={
                totals?.missing_cost_calls
                  ? `${formatNumber(totals.missing_cost_calls)} sin costo registrado`
                  : totals?.estimated_calls
                    ? `${formatNumber(totals.estimated_calls)} estimados`
                    : undefined
              }
            />
            <KpiCard
              label="Ganancia"
              icon={Wallet}
              loading={loading}
              value={formatCents(totals?.profit_in_cents)}
              hint="Cobrado − costo proveedor"
            />
            <KpiCard
              label="Margen"
              icon={Percent}
              loading={loading}
              value={formatPct(totals?.margin_percent)}
              hint={totals ? <MarginBadge value={totals.margin_percent} /> : undefined}
            />
            <KpiCard
              label="Llamadas"
              icon={PhoneCall}
              loading={loading}
              value={formatNumber(totals?.calls)}
              hint="Consumos aprobados"
            />
            <KpiCard
              label="Créditos gratis otorgados"
              icon={Gift}
              loading={loading}
              value={formatCents(totals?.free_credits_granted_in_cents)}
              hint="No es ingreso en efectivo"
            />
          </div>

          {groupBy === "day" ? (
            <Card>
              <CardHeader>
                <CardTitle>Cobrado vs costo por día</CardTitle>
                <CardDescription>Barras: cobrado y costo del proveedor; la línea marca la ganancia</CardDescription>
              </CardHeader>
              <CardContent>
                {loading || stale ? (
                  <Skeleton className="h-80 w-full rounded-lg" />
                ) : chartData.length === 0 ? (
                  <EmptyState className="h-80" icon={Bot} title="Sin consumos de IA en este periodo" />
                ) : (
                  <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
                    <ComposedChart data={chartData} margin={{ left: 4, right: 4, top: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={20}
                        tickFormatter={(value: string) => formatDay(value)}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={64}
                        tickFormatter={(value: number) => formatCOPCompact(value)}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => formatDay(String(value), { weekday: "short", day: "numeric", month: "short" })}
                            formatter={moneyTooltip}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="charged" fill="var(--color-charged)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Line
                        dataKey="profit"
                        type="monotone"
                        stroke="var(--color-profit)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "var(--color-profit)" }}
                      />
                    </ComposedChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card className="gap-0 overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">{COLUMN_LABELS[shownGroup]}</TableHead>
                  <TableHead className="text-right">Llamadas</TableHead>
                  <TableHead className="text-right">Cobrado</TableHead>
                  <TableHead className="text-right">Costo proveedor</TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      onClick={nextSort}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      aria-label="Ordenar por ganancia"
                    >
                      Ganancia
                      <SortIcon className="size-3.5" />
                    </button>
                  </TableHead>
                  <TableHead className="pr-4 text-right">Margen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || stale ? (
                  Array.from({ length: 6 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="px-4">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6}>
                      <EmptyState icon={Bot} title="Sin consumos de IA" description="No hubo consumos aprobados en este rango." />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={rowKey(row, shownGroup, index)}>
                      <TableCell className="max-w-64 truncate pl-4">
                        <RowLabel row={row} groupBy={shownGroup} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.calls)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCents(row.charged_in_cents)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {formatCents(row.provider_cost_in_cents)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          row.profit_in_cents < 0 && "text-red-700 dark:text-red-400"
                        )}
                      >
                        {formatCents(row.profit_in_cents)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <MarginBadge value={row.margin_percent} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {totals && !loading && !stale && rows.length > 0 ? (
                <TableFooter>
                  <TableRow>
                    <TableCell className="pl-4 font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatNumber(totals.calls)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCents(totals.charged_in_cents)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCents(totals.provider_cost_in_cents)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCents(totals.profit_in_cents)}</TableCell>
                    <TableCell className="pr-4 text-right">
                      <MarginBadge value={totals.margin_percent} />
                    </TableCell>
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </Card>

          {data?.note ? <p className="text-xs text-muted-foreground">{data.note}</p> : null}
        </>
      )}
    </>
  )
}

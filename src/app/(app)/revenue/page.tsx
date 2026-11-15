"use client"

import { useState } from "react"
import Link from "next/link"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import { ArrowRight, Bot, CreditCard, Repeat, TrendingUp, Wallet } from "lucide-react"
import useSWR from "swr"

import { EmptyState, ErrorState } from "@/components/empty-state"
import { KpiCard } from "@/components/kpi-card"
import { tooltipFormatter } from "@/components/money-tooltip"
import { PageHeader } from "@/components/page-header"
import { DateField, GroupBySelect } from "@/components/range-filters"
import { Button } from "@/components/ui/button"
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { errorMessage } from "@/lib/api/client"
import { revenueKey, type GroupBy, type Revenue } from "@/lib/api/metrics"
import {
  addMonths,
  currentMonth,
  formatCOP,
  formatCOPCompact,
  formatNumber,
  formatPeriod,
  todayLocal,
} from "@/lib/format"

const chartConfig = {
  subscriptions: { label: "Suscripciones", color: "var(--chart-1)" },
  ai_profit: { label: "Ganancia IA", color: "var(--chart-2)" },
  total: { label: "Total", color: "var(--foreground)" },
} satisfies ChartConfig

const moneyTooltip = tooltipFormatter(chartConfig)

export default function RevenuePage() {
  const [from, setFrom] = useState(() => `${addMonths(currentMonth(), -11)}-01`)
  const [to, setTo] = useState(todayLocal)
  const [groupBy, setGroupBy] = useState<GroupBy>("month")

  const { data, error, isLoading, mutate } = useSWR<Revenue>(
    revenueKey({ from, to, group_by: groupBy })
  )
  const loading = isLoading && !data
  const totals = data?.totals
  const hasData = (data?.series ?? []).some((point) => point.total !== 0 || point.ai_revenue !== 0)

  return (
    <>
      <PageHeader
        title="Ingresos"
        description="Suscripciones pagadas y ganancia de IA (cobrado − costo del proveedor)."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/ai-profit">
              Ver detalle de IA
              <ArrowRight />
            </Link>
          </Button>
        }
      />

      <Card className="py-4">
        <CardContent className="grid gap-3 px-4 sm:grid-cols-3 lg:max-w-2xl">
          <DateField id="from" label="Desde" value={from} max={to} onChange={setFrom} />
          <DateField id="to" label="Hasta" value={to} min={from} onChange={setTo} />
          <GroupBySelect value={groupBy} onChange={setGroupBy} />
        </CardContent>
      </Card>

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void mutate()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total del periodo"
              icon={Wallet}
              loading={loading}
              value={formatCOP(totals?.total)}
              hint="Suscripciones + ganancia IA"
            />
            <KpiCard label="Suscripciones" icon={CreditCard} loading={loading} value={formatCOP(totals?.subscriptions)} />
            <KpiCard
              label="Ganancia IA"
              icon={Bot}
              loading={loading}
              value={formatCOP(totals?.ai_profit)}
              hint={`${formatNumber(totals?.ai_calls)} llamadas de IA`}
            />
            <KpiCard
              label="MRR actual"
              icon={Repeat}
              loading={loading}
              value={formatCOP(data?.mrr)}
              hint="Suscripciones activas pagas"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ingresos por periodo</CardTitle>
              <CardDescription>Barras apiladas por fuente; la línea marca el total</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-80 w-full rounded-lg" />
              ) : !data || !hasData ? (
                <EmptyState className="h-80" icon={TrendingUp} title="Sin ingresos en este periodo" />
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
                  <ComposedChart data={data.series} margin={{ left: 4, right: 4, top: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={20}
                      tickFormatter={(value: string) => formatPeriod(value, data.group_by)}
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
                          labelFormatter={(value) => formatPeriod(String(value), data.group_by)}
                          formatter={moneyTooltip}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="subscriptions"
                      stackId="revenue"
                      fill="var(--color-subscriptions)"
                      stroke="var(--card)"
                      strokeWidth={1}
                      maxBarSize={48}
                    />
                    <Bar
                      dataKey="ai_profit"
                      stackId="revenue"
                      fill="var(--color-ai_profit)"
                      stroke="var(--card)"
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                    <Line
                      dataKey="total"
                      type="monotone"
                      stroke="var(--color-total)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: "var(--color-total)" }}
                    />
                  </ComposedChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Periodo</TableHead>
                  <TableHead className="text-right">Suscripciones</TableHead>
                  <TableHead className="text-right">IA cobrado</TableHead>
                  <TableHead className="text-right">IA costo</TableHead>
                  <TableHead className="text-right">Ganancia IA</TableHead>
                  <TableHead className="pr-4 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="px-4">
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : [...(data?.series ?? [])].reverse().map((point) => (
                      <TableRow key={point.period}>
                        <TableCell className="pl-4">
                          {formatPeriod(point.period, data?.group_by ?? groupBy)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCOP(point.subscriptions)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCOP(point.ai_revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          {formatCOP(point.ai_cost)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCOP(point.ai_profit)}</TableCell>
                        <TableCell className="pr-4 text-right font-medium tabular-nums">
                          {formatCOP(point.total)}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
              {totals && !loading ? (
                <TableFooter>
                  <TableRow>
                    <TableCell className="pl-4 font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCOP(totals.subscriptions)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCOP(totals.ai_revenue)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCOP(totals.ai_cost)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCOP(totals.ai_profit)}</TableCell>
                    <TableCell className="pr-4 text-right font-semibold tabular-nums">{formatCOP(totals.total)}</TableCell>
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </Card>
        </>
      )}
    </>
  )
}

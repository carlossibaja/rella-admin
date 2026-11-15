"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { BadgeCheck, CircleDashed, Percent, UserPlus } from "lucide-react"
import useSWR from "swr"

import { EmptyState, ErrorState } from "@/components/empty-state"
import { KpiCard } from "@/components/kpi-card"
import { tooltipFormatter } from "@/components/money-tooltip"
import { PageHeader } from "@/components/page-header"
import { DateField, GroupBySelect } from "@/components/range-filters"
import { STATUS_LABELS } from "@/components/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDebounced } from "@/hooks/use-debounced"
import { errorMessage } from "@/lib/api/client"
import { signupsKey, type GroupBy, type Signups } from "@/lib/api/metrics"
import type { OrganizationStatus } from "@/lib/api/organizations"
import { addDays, formatNumber, formatPct, formatPeriod, todayLocal } from "@/lib/format"

const ALL = "all"

const chartConfig = {
  unpaid: { label: "Sin pago", color: "var(--chart-5)" },
  paid: { label: "Con pago", color: "var(--chart-1)" },
} satisfies ChartConfig

const countTooltip = tooltipFormatter(chartConfig, "count")

export default function SignupsPage() {
  const [to, setTo] = useState(todayLocal)
  const [from, setFrom] = useState(() => addDays(todayLocal(), -29))
  const [groupBy, setGroupBy] = useState<GroupBy>("day")
  const [status, setStatus] = useState<OrganizationStatus | "">("")
  const [paid, setPaid] = useState<"yes" | "no" | "">("")
  const [planInput, setPlanInput] = useState("")
  const plan = useDebounced(planInput.trim())

  const { data, error, isLoading, mutate } = useSWR<Signups>(
    signupsKey({ from, to, group_by: groupBy, plan, status, paid })
  )
  const loading = isLoading && !data
  const series = (data?.series ?? []).map((point) => ({
    ...point,
    unpaid: point.count - point.paid,
  }))

  return (
    <>
      <PageHeader title="Altas" description="Empresas creadas en el periodo y cuántas pagaron." />

      <Card className="py-4">
        <CardContent className="grid gap-3 px-4 sm:grid-cols-3 lg:grid-cols-6">
          <DateField id="from" label="Desde" value={from} max={to} onChange={setFrom} />
          <DateField id="to" label="Hasta" value={to} min={from} onChange={setTo} />
          <GroupBySelect value={groupBy} onChange={setGroupBy} />
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select
              value={status || ALL}
              onValueChange={(value) => setStatus(value === ALL ? "" : (value as OrganizationStatus))}
            >
              <SelectTrigger className="w-full" aria-label="Estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {(Object.keys(STATUS_LABELS) as OrganizationStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Pago</Label>
            <Select
              value={paid || ALL}
              onValueChange={(value) => setPaid(value === ALL ? "" : (value as "yes" | "no"))}
            >
              <SelectTrigger className="w-full" aria-label="Pago">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                <SelectItem value="yes">Con pago</SelectItem>
                <SelectItem value="no">Sin pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="plan" className="text-xs text-muted-foreground">
              Plan
            </Label>
            <Input
              id="plan"
              placeholder="slug del plan"
              value={planInput}
              onChange={(e) => setPlanInput(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void mutate()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Altas" icon={UserPlus} loading={loading} value={formatNumber(data?.totals.count)} />
            <KpiCard label="Con pago" icon={BadgeCheck} loading={loading} value={formatNumber(data?.totals.paid)} />
            <KpiCard label="Sin pago" icon={CircleDashed} loading={loading} value={formatNumber(data?.totals.unpaid)} />
            <KpiCard
              label="Conversión"
              icon={Percent}
              loading={loading}
              value={formatPct(data?.totals.paid_pct ?? null)}
              hint="Altas que hicieron al menos un pago"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Altas por periodo</CardTitle>
              <CardDescription>Con pago y sin pago, apiladas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full rounded-lg" />
              ) : !data || data.totals.count === 0 ? (
                <EmptyState className="h-72" icon={UserPlus} title="Sin altas en este periodo" />
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
                    <Bar dataKey="paid" stackId="signups" fill="var(--color-paid)" stroke="var(--card)" strokeWidth={1} />
                    <Bar
                      dataKey="unpaid"
                      stackId="signups"
                      fill="var(--color-unpaid)"
                      stroke="var(--card)"
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]}
                    />
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
                  <TableHead className="text-right">Altas</TableHead>
                  <TableHead className="text-right">Con pago</TableHead>
                  <TableHead className="text-right">Sin pago</TableHead>
                  <TableHead className="pr-4 text-right">Conversión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="px-4">
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : [...series].reverse().map((point) => (
                      <TableRow key={point.period}>
                        <TableCell className="pl-4">
                          {formatPeriod(point.period, data?.group_by ?? groupBy)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(point.count)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(point.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(point.unpaid)}</TableCell>
                        <TableCell className="pr-4 text-right tabular-nums">
                          {point.count ? formatPct((point.paid / point.count) * 100) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  )
}

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarClock,
  CreditCard,
  Repeat,
  Sparkles,
  Wallet,
} from "lucide-react"
import useSWR from "swr"

import { EmptyState, ErrorState } from "@/components/empty-state"
import { KpiCard } from "@/components/kpi-card"
import { tooltipFormatter } from "@/components/money-tooltip"
import { MonthSelect } from "@/components/month-select"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { errorMessage, fetchBody } from "@/lib/api/client"
import { overviewKey, type Overview } from "@/lib/api/metrics"
import { organizationsKey, type OrganizationRow, type Paginated } from "@/lib/api/organizations"
import {
  currentMonth,
  formatCOP,
  formatCOPCompact,
  formatDate,
  formatDay,
  formatMonth,
  formatNumber,
} from "@/lib/format"

const incomeConfig = {
  subscriptions: { label: "Suscripciones", color: "var(--chart-1)" },
  ai_profit: { label: "Ganancia IA", color: "var(--chart-2)" },
  total: { label: "Total acumulado", color: "var(--chart-1)" },
} satisfies ChartConfig

const incomeTooltip = tooltipFormatter(incomeConfig)

const statusConfig = {
  active: { label: "Activas", color: "oklch(0.696 0.17 162.48)" },
  expiring: { label: "Por vencer", color: "oklch(0.769 0.188 70.08)" },
  expired: { label: "Vencidas", color: "oklch(0.637 0.237 25.331)" },
  none: { label: "Sin plan", color: "oklch(0.705 0.015 286.067)" },
} satisfies ChartConfig

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth)
  const { data, error, isLoading, mutate } = useSWR<Overview>(overviewKey(month))
  const loading = isLoading && !data

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          <>
            Resumen de {formatMonth(month, "long").toLowerCase()}
          </>
        }
        actions={<MonthSelect value={month} onChange={setMonth} />}
      />

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void mutate()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label="Ingresos del mes"
              icon={Wallet}
              loading={loading}
              value={formatCOP(data?.revenue.total)}
              change={data?.revenue.change_pct ?? null}
              hint={`vs ${formatCOP(data?.revenue.previous_same_days_total)} en los mismos días del mes anterior`}
            />
            <KpiCard
              label="Suscripciones"
              icon={CreditCard}
              loading={loading}
              value={formatCOP(data?.revenue.subscriptions)}
              hint="Pagos aprobados de planes"
            />
            <KpiCard
              label="Ganancia IA"
              icon={Bot}
              loading={loading}
              value={formatCOP(data?.revenue.ai_profit)}
              hint={`${formatCOP(data?.revenue.ai_revenue)} cobrado · ${formatCOP(data?.revenue.ai_cost)} costo`}
            />
            <KpiCard
              label="MRR"
              icon={Repeat}
              loading={loading}
              value={formatCOP(data?.mrr)}
              hint="Ingreso mensual recurrente estimado"
            />
            <KpiCard
              label="Empresas activas"
              icon={Building2}
              loading={loading}
              value={formatNumber(data?.organizations.active)}
              hint={`de ${formatNumber(data?.organizations.total)} empresas`}
            />
            <KpiCard
              label="Nuevas este mes"
              icon={Sparkles}
              loading={loading}
              value={formatNumber(data?.organizations.new_this_month)}
              hint={`${formatNumber(data?.organizations.new_previous_month)} el mes anterior`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <IncomeChart data={data} loading={loading} />
            <StatusDonut data={data} loading={loading} />
          </div>

          <ExpiringList />
        </>
      )}
    </>
  )
}

function IncomeChart({ data, loading }: { data?: Overview; loading: boolean }) {
  const [mode, setMode] = useState<"daily" | "cumulative">("daily")

  const cumulative = useMemo(
    () =>
      (data?.daily ?? []).reduce<{ date: string; total: number }[]>((acc, day) => {
        const previous = acc.at(-1)?.total ?? 0
        acc.push({ date: day.date, total: previous + day.total })
        return acc
      }, []),
    [data]
  )

  const hasIncome = (data?.daily ?? []).some((day) => day.total !== 0)

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Ingresos diarios</CardTitle>
          <CardDescription>
            {mode === "daily"
              ? "Suscripciones y ganancia de IA por día"
              : "Total acumulado en el mes"}
          </CardDescription>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={(value) => value && setMode(value as typeof mode)}
        >
          <ToggleGroupItem value="daily">Diario</ToggleGroupItem>
          <ToggleGroupItem value="cumulative">Acumulado</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full rounded-lg" />
        ) : !hasIncome ? (
          <EmptyState
            className="h-72"
            icon={Wallet}
            title="Sin ingresos en este mes"
            description="Cuando haya pagos o consumo de IA aparecerán aquí."
          />
        ) : mode === "daily" ? (
          <ChartContainer config={incomeConfig} className="aspect-auto h-72 w-full">
            <BarChart data={data?.daily} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
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
                    labelFormatter={(value) => formatDay(String(value), { dateStyle: "medium" })}
                    formatter={incomeTooltip}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="subscriptions"
                stackId="income"
                fill="var(--color-subscriptions)"
                stroke="var(--card)"
                strokeWidth={1}
              />
              <Bar
                dataKey="ai_profit"
                stackId="income"
                fill="var(--color-ai_profit)"
                stroke="var(--card)"
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartContainer config={incomeConfig} className="aspect-auto h-72 w-full">
            <AreaChart data={cumulative} margin={{ left: 4, right: 4 }}>
              <defs>
                <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value: string) => formatDay(value)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value: number) => formatCOPCompact(value)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(value) => formatDay(String(value), { dateStyle: "medium" })}
                    formatter={incomeTooltip}
                  />
                }
              />
              <Area
                dataKey="total"
                type="monotone"
                stroke="var(--color-total)"
                strokeWidth={2}
                fill="url(#fillTotal)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function StatusDonut({ data, loading }: { data?: Overview; loading: boolean }) {
  const slices = (["active", "expiring", "expired", "none"] as const).map((status) => ({
    status,
    count: data?.organizations[status] ?? 0,
    fill: `var(--color-${status})`,
  }))
  const total = data?.organizations.total ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Empresas por estado</CardTitle>
        <CardDescription>Estado actual de las suscripciones</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <Skeleton className="mx-auto size-52 rounded-full" />
        ) : total === 0 ? (
          <EmptyState className="h-52" icon={Building2} title="Aún no hay empresas" />
        ) : (
          <div className="relative">
            <ChartContainer config={statusConfig} className="mx-auto aspect-square h-52">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel nameKey="status" />}
                />
                <Pie
                  data={slices}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={62}
                  outerRadius={90}
                  strokeWidth={2}
                  stroke="var(--card)"
                  paddingAngle={1}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.status} fill={slice.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums">{formatNumber(total)}</span>
              <span className="text-xs text-muted-foreground">empresas</span>
            </div>
          </div>
        )}
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {slices.map((slice) => (
            <li key={slice.status} className="flex items-center gap-2">
              <span className="size-2.5 rounded-[2px]" style={{ background: statusConfig[slice.status].color }} />
              <span className="text-muted-foreground">{statusConfig[slice.status].label}</span>
              <span className="ml-auto font-medium tabular-nums">
                {loading ? "—" : formatNumber(slice.count)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function ExpiringList() {
  const { data, isLoading } = useSWR<Paginated<OrganizationRow>>(
    organizationsKey({ status: "expiring", sort: "expires_at", per_page: 5 }),
    fetchBody
  )
  const rows = data?.data ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Por vencer</CardTitle>
          <CardDescription>Empresas cuyo plan vence en los próximos 7 días</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/organizations?status=expiring">
            Ver todas <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && !data ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nada por vencer"
            description="Ninguna empresa vence en los próximos 7 días."
          />
        ) : (
          <ul className="divide-y">
            {rows.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/organizations/${org.id}`}
                  className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{org.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {org.plan?.name ?? "Sin plan"} · {org.owner?.email ?? "Sin propietario"}
                    </p>
                  </div>
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    {formatDate(org.expires_at)}
                  </span>
                  <StatusBadge status={org.status} daysLeft={org.days_left} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

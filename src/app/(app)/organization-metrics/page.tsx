"use client"

import { useState } from "react"
import { Building2, FlaskConical, History, Percent, Trash2 } from "lucide-react"
import useSWR from "swr"

import { ErrorState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { DateField, GroupBySelect } from "@/components/range-filters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api/client"
import { organizationMetricsKey, type GroupBy, type OrganizationMetrics } from "@/lib/api/metrics"
import { addMonths, currentMonth, formatNumber, todayLocal } from "@/lib/format"

import { ChartCard, InfoHint, StatTile } from "./chart-card"
import { CHART_HELP, EVENT_HELP, EVENT_LABELS, formatRate } from "./definitions"
import { DonutChart } from "./donut-chart"
import { CreatedDeletedChart, LossesChart, NetGrowthChart } from "./trend-charts"

/** Default range: the current month and the 2 before it (a quarter), through today. */
const DEFAULT_RANGE_MONTHS = 3

/** First day of the month `DEFAULT_RANGE_MONTHS - 1` months back, always sent as `from`. */
function defaultFrom() {
  return `${addMonths(currentMonth(), -(DEFAULT_RANGE_MONTHS - 1))}-01`
}

export default function OrganizationMetricsPage() {
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(todayLocal)
  const [groupBy, setGroupBy] = useState<GroupBy>("month")

  const { data, error, isLoading, mutate } = useSWR<OrganizationMetrics>(
    organizationMetricsKey({ from, to, group_by: groupBy })
  )
  const loading = isLoading && !data
  const series = data?.series ?? []
  const snapshot = data?.snapshot
  const totals = data?.totals
  const resolvedGroupBy = data?.group_by ?? groupBy
  const churnedTotal = totals?.churned_payment ?? null
  const converted = totals?.converted ?? 0
  const trialExpired = totals?.trial_expired_unconverted ?? 0

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
            <SectionHeading
              title="Estado actual"
              help={CHART_HELP.snapshot}
              description="Foto de hoy, no depende del rango."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <ChartCard
                className="lg:col-span-2"
                title="Empresas por estado"
                help={CHART_HELP.snapshot}
                description="Activas, por vencer, vencidas y sin plan suman el total"
                loading={loading}
                empty={!snapshot?.total}
                emptyIcon={Building2}
                emptyTitle="Todavía no hay empresas"
              >
                {snapshot ? (
                  <DonutChart
                    centerValue={formatNumber(snapshot.total)}
                    centerLabel="empresas"
                    slices={[
                      { key: "active", label: "Activas", value: snapshot.active, color: "var(--chart-2)" },
                      { key: "expiring", label: "Por vencer", value: snapshot.expiring, color: "var(--chart-3)" },
                      { key: "expired", label: "Vencidas", value: snapshot.expired, color: "var(--chart-4)" },
                      { key: "none", label: "Sin plan", value: snapshot.none, color: "var(--chart-5)" },
                    ]}
                  />
                ) : null}
              </ChartCard>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Callout
                  icon={FlaskConical}
                  label="En prueba"
                  help={CHART_HELP.trialing}
                  value={snapshot?.trialing}
                  note="Se solapa con activas y por vencer; no suma al total."
                  loading={loading}
                />
                <Callout
                  icon={Trash2}
                  label="Eliminadas, pendientes de purga"
                  help={CHART_HELP.pendingPurge}
                  value={snapshot?.deleted}
                  note="No incluidas en el total."
                  loading={loading}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading
              title="En el rango"
              help="Eventos ocurridos entre las fechas seleccionadas (zona horaria America/Bogota). El periodo actual está en curso."
              description="Eventos ocurridos entre las fechas seleccionadas."
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              <StatTile
                label={EVENT_LABELS.created}
                help={EVENT_HELP.created}
                loading={loading}
                value={formatNumber(totals?.created)}
              />
              <StatTile
                label={EVENT_LABELS.converted}
                help={EVENT_HELP.converted}
                loading={loading}
                value={formatNumber(totals?.converted)}
              />
              <StatTile
                label="Tasa de conversión"
                help={EVENT_HELP.conversion_rate_pct}
                loading={loading}
                value={formatRate(totals?.conversion_rate_pct)}
              />
              <StatTile
                label={EVENT_LABELS.cancelled}
                help={EVENT_HELP.cancelled}
                loading={loading}
                value={formatNumber(totals?.cancelled)}
              />
              <StatTile
                label={EVENT_LABELS.trial_expired_unconverted}
                help={EVENT_HELP.trial_expired_unconverted}
                loading={loading}
                value={formatNumber(totals?.trial_expired_unconverted)}
              />
              <StatTile
                label={EVENT_LABELS.deleted}
                help={EVENT_HELP.deleted}
                loading={loading}
                value={formatNumber(totals?.deleted)}
              />
              <StatTile
                label={EVENT_LABELS.churned_payment}
                help={EVENT_HELP.churned_payment}
                loading={loading}
                muted={churnedTotal === null}
                value={churnedTotal === null ? "No disponible" : formatNumber(churnedTotal)}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <CreatedDeletedChart series={series} groupBy={resolvedGroupBy} loading={loading} />
              <NetGrowthChart series={series} groupBy={resolvedGroupBy} loading={loading} />
              <ChartCard
                title="Conversión de la prueba"
                help={CHART_HELP.conversion}
                description="Pruebas resueltas en el rango: pagaron vs. vencieron sin pagar"
                loading={loading}
                empty={converted + trialExpired === 0}
                emptyIcon={Percent}
                emptyTitle="Sin pruebas resueltas en este rango"
              >
                <div className="flex min-h-64 items-center">
                  <DonutChart
                    centerValue={formatRate(totals?.conversion_rate_pct)}
                    centerLabel="conversión"
                    slices={[
                      {
                        key: "converted",
                        label: EVENT_LABELS.converted,
                        value: converted,
                        color: "var(--chart-2)",
                      },
                      {
                        key: "trial_expired_unconverted",
                        label: EVENT_LABELS.trial_expired_unconverted,
                        value: trialExpired,
                        color: "var(--chart-5)",
                      },
                    ]}
                  />
                </div>
              </ChartCard>
              <LossesChart series={series} groupBy={resolvedGroupBy} loading={loading} />
            </div>

            <Card className="flex-row items-start gap-3 px-4 py-3 text-muted-foreground">
              <History className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="text-sm">
                <span className="font-medium text-foreground">Activas vs. no renovaron por mes:</span> no disponible
                todavía; requiere historial de periodos de suscripción.
              </p>
            </Card>
          </section>
        </>
      )}
    </>
  )
}

function SectionHeading({ title, help, description }: { title: string; help: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
        {title}
        <InfoHint text={help} label={`Definición: ${title}`} />
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

/** Snapshot figure that sits beside the donut because it overlaps or sits outside the total. */
function Callout({
  icon: Icon,
  label,
  help,
  value,
  note,
  loading,
}: {
  icon: typeof Building2
  label: string
  help: string
  value: number | undefined
  note: string
  loading: boolean
}) {
  return (
    <Card className="h-full gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" aria-hidden />
          <span>{label}</span>
          <InfoHint text={help} label={`Definición: ${label}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-4">
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatNumber(value)}</p>
        )}
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  )
}

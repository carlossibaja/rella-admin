import type { GroupBy, OrganizationMetricsPoint } from "@/lib/api/metrics"
import { addDays, currentMonth, formatNumber, formatPeriod, todayLocal } from "@/lib/format"

/** Event metrics per period, in display order. */
export type EventMetric = Exclude<keyof OrganizationMetricsPoint, "period">

export const EVENT_LABELS: Record<EventMetric, string> = {
  created: "Creadas",
  converted: "Convertidas a pago",
  cancelled: "Cancelaron plan",
  deleted: "Eliminadas",
  trial_expired_unconverted: "Prueba vencida sin pagar",
  churned_payment: "Caídas por falta de pago",
}

export const EVENT_HELP: Record<EventMetric | "conversion_rate_pct", string> = {
  created:
    "Empresas creadas en el periodo. Incluye las que luego se eliminaron (por eso difiere de Altas, que las excluye).",
  converted: "Empresas cuyo primer pago de suscripción aprobado ocurrió en el periodo.",
  cancelled: "Planes pagos cancelados en el periodo. Apagar la renovación automática no cuenta.",
  deleted: "Empresas eliminadas (soft delete) en el periodo.",
  trial_expired_unconverted:
    "Planes gratuitos que vencieron en el periodo sin que la empresa haya pagado nunca. Se evalúa a hoy: periodos pasados pueden bajar si la empresa paga después.",
  churned_payment: "Aún no disponible: no hay historial de suspensiones por falta de pago.",
  conversion_rate_pct: "Convertidas ÷ (convertidas + prueba vencida sin pagar).",
}

/** Help for the composed charts and the snapshot (America/Bogota time zone). */
export const CHART_HELP = {
  createdDeleted: `${EVENT_HELP.created} ${EVENT_HELP.deleted}`,
  netGrowth:
    "Suma acumulada de (creadas − eliminadas) desde el inicio del rango. No cuenta las empresas que ya existían antes.",
  conversion: `${EVENT_HELP.converted} ${EVENT_HELP.trial_expired_unconverted} Tasa: ${EVENT_HELP.conversion_rate_pct}`,
  losses: `${EVENT_HELP.cancelled} ${EVENT_HELP.trial_expired_unconverted} ${EVENT_HELP.deleted}`,
  snapshot:
    "Foto de hoy, no depende del rango. Activas, por vencer, vencidas y sin plan suman el total; no incluye las eliminadas.",
  trialing: "Empresas en plan gratuito hoy. Se solapan con activas y por vencer, así que no suman al total.",
  pendingPurge: "Empresas eliminadas (soft delete) que aún no se purgan. No están incluidas en el total.",
} as const

/** Formats a percentage with exactly one decimal; "—" when null. */
export function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return `${value.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

/** Count with an explicit sign ("+3", "−2", "0"). */
export function formatSigned(value: number) {
  if (value > 0) return `+${formatNumber(value)}`
  if (value < 0) return `−${formatNumber(Math.abs(value))}`
  return "0"
}

/** Whether the bucket starting at `period` contains today (Bogota), i.e. it is still in progress. */
export function isCurrentPeriod(period: string, groupBy: GroupBy) {
  const today = todayLocal()
  if (groupBy === "month") return period === currentMonth()
  if (groupBy === "week") return period <= today && today <= addDays(period, 6)
  return period === today
}

/** Period label for tooltips; the in-progress bucket is flagged as partial. */
export function periodLabel(period: string, groupBy: GroupBy) {
  const label = formatPeriod(period, groupBy)
  return isCurrentPeriod(period, groupBy) ? `${label} (en curso)` : label
}

import type { GroupBy, OrganizationMetricsPoint } from "@/lib/api/metrics"
import { addDays, currentMonth, formatDate, formatNumber, formatPeriod, localDay, todayLocal } from "@/lib/format"

/** Event metrics per period, in display order. */
export type EventMetric = Exclude<keyof OrganizationMetricsPoint, "period">

export const EVENT_LABELS: Record<EventMetric, string> = {
  created: "Creadas",
  converted: "Convertidas a pago",
  cancelled: "Cancelaron plan",
  deleted: "Eliminadas",
  trial_expired_unconverted: "Prueba vencida sin pagar",
  churned_payment: "Caídas por falta de pago",
  active: "Activas",
  not_renewed: "No renovaron",
  renewal_stopped: "Apagaron renovación",
}

export const EVENT_HELP: Record<EventMetric | "conversion_rate_pct", string> = {
  created:
    "Empresas creadas en el periodo. Incluye las que luego se eliminaron (por eso difiere de Altas, que las excluye).",
  converted: "Empresas cuyo primer pago de suscripción aprobado ocurrió en el periodo.",
  cancelled: "Planes pagos cancelados en el periodo. Apagar la renovación automática no cuenta.",
  deleted: "Empresas eliminadas (soft delete) en el periodo.",
  trial_expired_unconverted:
    "Planes gratuitos que vencieron en el periodo sin que la empresa haya pagado nunca. Se evalúa a hoy: periodos pasados pueden bajar si la empresa paga después.",
  churned_payment: "Empresas suspendidas por falta de pago en el periodo.",
  active:
    "Empresas con un periodo pago y no suspendido vigente al cierre del periodo (o ahora, si está en curso). No incluye el plan gratuito.",
  not_renewed:
    "Periodos pagos que terminaron en el periodo, con al menos 5 días de gracia vencidos y sin un periodo pago posterior. Incluye cancelaciones, suspensiones, renovación apagada y renovaciones tardías; cambiar a otro plan pago no cuenta.",
  renewal_stopped:
    "Empresas cuyo último cambio de renovación automática en el periodo fue apagarla. Es una señal de riesgo: todavía no es una pérdida.",
  conversion_rate_pct: "Convertidas ÷ (convertidas + prueba vencida sin pagar).",
}

/** Help for the composed charts and the snapshot (America/Bogota time zone). */
export const CHART_HELP = {
  createdDeleted: `${EVENT_HELP.created} ${EVENT_HELP.deleted}`,
  netGrowth:
    "Suma acumulada de (creadas − eliminadas) desde el inicio del rango. No cuenta las empresas que ya existían antes.",
  conversion: `${EVENT_HELP.converted} ${EVENT_HELP.trial_expired_unconverted} Tasa: ${EVENT_HELP.conversion_rate_pct}`,
  losses: `Eventos de pérdida, sin solaparse entre sí. ${EVENT_HELP.cancelled} ${EVENT_HELP.churned_payment} ${EVENT_HELP.deleted} ${EVENT_HELP.trial_expired_unconverted} "No renovaron" y "Apagaron renovación" se muestran aparte: el primero es el desenlace de varias de estas causas y el segundo aún no es una pérdida.`,
  activeNotRenewed: `Activas (línea): ${EVENT_HELP.active} No renovaron (barras): ${EVENT_HELP.not_renewed} Los periodos sin historial se dejan vacíos, no en 0.`,
  retention:
    "Métricas basadas en el historial de periodos de suscripción. Los periodos anteriores al inicio del historial no tienen datos (no son 0).",
  activeAtClose:
    "Empresas activas al cierre del último periodo con datos del rango (o ahora, si está en curso). No incluye el plan gratuito.",
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

/** Value for a nullable count: "Sin datos" when the backend has no history for it. */
export function formatNullableCount(value: number | null | undefined) {
  return value === null || value === undefined ? "Sin datos" : formatNumber(value)
}

/**
 * How the subscription history covers the selected range:
 * - `none`: there is no history yet (`history_starts_at` is null).
 * - `partial`: history starts on or after the range start, so earlier buckets have no data.
 * - `full`: history covers the whole range (or the data is not loaded yet).
 */
export type HistoryCoverage = { kind: "none" } | { kind: "partial"; since: string } | { kind: "full" }

export function historyCoverage(historyStartsAt: string | null | undefined, rangeFrom: string): HistoryCoverage {
  if (historyStartsAt === undefined) return { kind: "full" }
  if (historyStartsAt === null) return { kind: "none" }
  if (localDay(historyStartsAt) >= rangeFrom) return { kind: "partial", since: formatDate(historyStartsAt) }
  return { kind: "full" }
}

/** Note shown on history-based charts and tiles; null when the history covers the range. */
export function historyNoteText(coverage: HistoryCoverage) {
  if (coverage.kind === "none") return "Sin historial todavía."
  if (coverage.kind === "partial") return `Historial desde ${coverage.since}; períodos anteriores sin datos.`
  return null
}

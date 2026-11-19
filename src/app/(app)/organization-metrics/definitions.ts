import type { OrganizationMetricsPoint } from "@/lib/api/metrics"

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

/** Formats a percentage with exactly one decimal; "—" when null. */
export function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return `${value.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

/** `converted / (converted + trial_expired_unconverted)`; null when the denominator is 0. */
export function conversionRate(point: Pick<OrganizationMetricsPoint, "converted" | "trial_expired_unconverted">) {
  const denominator = point.converted + point.trial_expired_unconverted
  return denominator ? (point.converted / denominator) * 100 : null
}

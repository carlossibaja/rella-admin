import type { Plan } from "@/lib/api/organizations"

const PERIOD_UNITS: Record<string, [string, string]> = {
  Day: ["día", "días"],
  Week: ["semana", "semanas"],
  Month: ["mes", "meses"],
  Year: ["año", "años"],
}

/** Billing period suffix for a plan price, e.g. "/mes" or "/3 meses". */
export function planPeriod(plan: Plan) {
  const [one, many] = PERIOD_UNITS[plan.periodicity_type] ?? [plan.periodicity_type, plan.periodicity_type]
  return plan.periodicity === 1 ? `/${one}` : `/${plan.periodicity} ${many}`
}

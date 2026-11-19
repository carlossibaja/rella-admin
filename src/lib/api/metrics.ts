import { fetchData, withQuery } from "./client"
import type { OrganizationStatus } from "./organizations"

export type GroupBy = "day" | "week" | "month"

export type Overview = {
  month: string
  currency: string
  revenue: {
    subscriptions: number
    /** AI consumption paid with recharged (paid) credits. */
    ai_revenue: number
    /** AI consumption paid with gifted (promotional) credits; not income. */
    ai_promo_consumed?: number
    /** Provider cost of the gifted consumption (already inside `ai_cost`). */
    ai_promo_cost?: number
    /** Every provider cost, paid and gifted. */
    ai_cost: number
    /** `ai_revenue − ai_cost`; negative when AI loses money. */
    ai_profit: number
    /** `subscriptions + ai_profit` (gross of Wompi fees). */
    total: number
    /** Wompi commission + VAT on approved payments (real cost). */
    wompi_fees?: number
    /** Retención en la fuente (1.5% of gross); a tax credit, not a cost. */
    withholding?: number
    /** `total − wompi_fees`. */
    net_total?: number
    previous_month_total: number
    previous_same_days_total: number
    /** null when the previous month total is 0. */
    change_pct: number | null
  }
  mrr: number
  organizations: {
    total: number
    active: number
    expiring: number
    expired: number
    none: number
    new_this_month: number
    new_previous_month: number
  }
  daily: {
    date: string
    subscriptions: number
    ai_profit: number
    ai_promo_cost?: number
    total: number
    wompi_fees?: number
    /** `total − wompi_fees`; can be negative. */
    net_total?: number
  }[]
}

export type SignupFilters = {
  from?: string
  to?: string
  group_by?: GroupBy
  plan?: string
  status?: OrganizationStatus | ""
  paid?: "yes" | "no" | ""
}

export type Signups = {
  from: string
  to: string
  timezone: string
  group_by: GroupBy
  series: { period: string; count: number; paid: number }[]
  totals: { count: number; paid: number; unpaid: number; paid_pct: number | null }
}

export type RevenueFilters = {
  from?: string
  to?: string
  group_by?: GroupBy
}

export type RevenuePoint = {
  period: string
  subscriptions: number
  /** AI consumption paid with recharged (paid) credits. */
  ai_revenue: number
  /** AI consumption paid with gifted credits; not income. */
  ai_promo_consumed?: number
  /** Provider cost of the gifted consumption (already inside `ai_cost`). */
  ai_promo_cost?: number
  /** Every provider cost, paid and gifted. */
  ai_cost: number
  /** `ai_revenue − ai_cost`; can be negative. */
  ai_profit: number
  total: number
  /** Wompi commission + VAT on approved payments (real cost). */
  wompi_fees?: number
  /** Retención en la fuente (1.5% of gross); a tax credit, not a cost. */
  withholding?: number
  /** `total − wompi_fees`; can be negative. */
  net_total?: number
}

export type Revenue = {
  from: string
  to: string
  timezone: string
  group_by: GroupBy
  currency: string
  series: RevenuePoint[]
  totals: Omit<RevenuePoint, "period"> & { ai_calls: number; ai_free_credits_granted: number }
  mrr: number
}

export function overviewKey(month: string) {
  return withQuery("/staff/metrics/overview", { month })
}

export function signupsKey(filters: SignupFilters) {
  return withQuery("/staff/metrics/signups", filters)
}

export function revenueKey(filters: RevenueFilters) {
  return withQuery("/staff/metrics/revenue", filters)
}

export type OrganizationMetricsFilters = {
  from?: string
  to?: string
  group_by?: GroupBy
}

/** Lifecycle event counts for one period (or the whole range). */
export type OrganizationMetricsPoint = {
  period: string
  /** Organizations created, including ones deleted later. */
  created: number
  /** First approved subscription payment. */
  converted: number
  /** Paid plan cancelled (turning auto-renew off is not counted). */
  cancelled: number
  /** Suspensions for missing payment; null until the backend keeps that history. */
  churned_payment: number | null
  /** Soft-deleted organizations. */
  deleted: number
  /** Free plan expired and the organization never paid (evaluated as of today). */
  trial_expired_unconverted: number
}

export type OrganizationMetrics = {
  from: string
  to: string
  timezone: string
  group_by: GroupBy
  series: OrganizationMetricsPoint[]
  totals: Omit<OrganizationMetricsPoint, "period"> & {
    /** `converted / (converted + trial_expired_unconverted)`; null when both are 0. */
    conversion_rate_pct: number | null
  }
  /** Current state, independent of the range. `active + expiring + expired + none = total`. */
  snapshot: {
    total: number
    active: number
    expiring: number
    expired: number
    none: number
    /** On a free trial right now; overlaps `active`/`expiring`. */
    trialing: number
    /** Soft-deleted, pending purge; not counted in `total`. */
    deleted: number
  }
}

export function organizationMetricsKey(filters: OrganizationMetricsFilters) {
  return withQuery("/staff/metrics/organizations", filters)
}

export type AiProfitGroupBy = "day" | "organization" | "model" | "concept"

export type AiProfitFilters = {
  from?: string
  to?: string
  group_by?: AiProfitGroupBy
}

/** Money of the AI profit report, in cents (convert with `centsToPesos`). */
export type AiProfitMoney = {
  /** Every consumption, paid plus gifted. */
  charged_in_cents: number
  /** Consumption paid with recharged credits (real income). */
  paid_charged_in_cents?: number
  /** Consumption paid with gifted credits (not income). */
  promo_charged_in_cents?: number
  /** Provider cost of every consumption. */
  provider_cost_in_cents: number
  /** Provider cost of the gifted consumption (part of `provider_cost_in_cents`). */
  promo_cost_in_cents?: number
  /** `paid_charged − provider_cost`; can be negative. */
  profit_in_cents: number
  /** Profit over paid charged; null when nothing was paid. */
  margin_percent: number | null
  calls: number
}

/** One row; which key is present depends on `group_by`. */
export type AiProfitRow = AiProfitMoney & {
  date?: string
  organization_id?: number
  organization_name?: string | null
  model?: string | null
  concept?: string | null
  label?: string | null
}

export type AiProfit = {
  from: string
  to: string
  timezone: string
  group_by: AiProfitGroupBy
  totals: AiProfitMoney & {
    estimated_calls: number
    missing_cost_calls: number
    free_credits_granted_in_cents: number
  }
  rows: AiProfitRow[]
  note?: string
}

export function aiProfitKey(filters: AiProfitFilters) {
  return withQuery("/staff/metrics/ai-profit", filters)
}

export function getAiProfit(filters: AiProfitFilters) {
  return fetchData<AiProfit>(aiProfitKey(filters))
}

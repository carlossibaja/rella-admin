import { fetchData, withQuery } from "./client"
import type { OrganizationStatus } from "./organizations"

export type GroupBy = "day" | "week" | "month"

export type Overview = {
  month: string
  currency: string
  revenue: {
    subscriptions: number
    ai_revenue: number
    ai_cost: number
    ai_profit: number
    total: number
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
  daily: { date: string; subscriptions: number; ai_profit: number; total: number }[]
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
  ai_revenue: number
  ai_cost: number
  ai_profit: number
  total: number
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

export type AiProfitGroupBy = "day" | "organization" | "model" | "concept"

export type AiProfitFilters = {
  from?: string
  to?: string
  group_by?: AiProfitGroupBy
}

/** Money of the AI profit report, in cents (convert with `centsToPesos`). */
export type AiProfitMoney = {
  charged_in_cents: number
  provider_cost_in_cents: number
  profit_in_cents: number
  /** null when nothing was charged. */
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

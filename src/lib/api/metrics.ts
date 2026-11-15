import { withQuery } from "./client"
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

import { withQuery } from "./client"
import type { Paginated } from "./organizations"

/*
 * Staff transactions API (planned contract, not built yet). Fields the backend
 * may omit are typed optional/nullable so the UI degrades to "—".
 */

type NamedRef = { id: number; name: string }

/* ---------------------------------------------------------------- RellaCash */

export type RellaCashType = "recharge" | "consumption" | "refund" | "adjustment"
export type RellaCashFunding = "paid" | "promo" | "mixed"
export type RellaCashSort = "-created_at" | "amount" | "-amount"

export type RellaCashTransaction = {
  id: number
  created_at: string
  organization: NamedRef | null
  type: RellaCashType | string
  type_label?: string | null
  status?: string | null
  concept?: string | null
  concept_label?: string | null
  description?: string | null
  /** Signed COP pesos: positive credits, negative debits. */
  amount: number
  /** Portion paid with gifted (promotional) credits. */
  promo_amount?: number | null
  /** Portion paid with purchased credits. */
  paid_amount?: number | null
  provider_cost?: number | null
  model?: string | null
  balance_after?: number | null
  user?: NamedRef | null
  ticket_id?: number | string | null
}

export type RellaCashTotals = {
  count?: number
  credited?: number
  debited?: number
  promo_consumed?: number
  provider_cost?: number
}

export type RellaCashPage = Paginated<RellaCashTransaction> & { totals?: RellaCashTotals }

export type RellaCashFilters = {
  search?: string
  organization_id?: string
  type?: RellaCashType | ""
  status?: string
  concept?: string
  funding?: RellaCashFunding | ""
  from?: string
  to?: string
  sort?: RellaCashSort
  per_page?: number
  page?: number
}

export function rellaCashTransactionsKey(filters: RellaCashFilters) {
  return withQuery("/staff/transactions", filters)
}

/** How a consumption was funded, derived from its promo/paid split. */
export function fundingOf(row: Pick<RellaCashTransaction, "promo_amount" | "paid_amount">) {
  const promo = Math.abs(row.promo_amount ?? 0) > 0
  const paid = Math.abs(row.paid_amount ?? 0) > 0
  if (promo && paid) return "mixed"
  if (promo) return "promo"
  if (paid) return "paid"
  return null
}

/* ---------------------------------------------------- Subscription payments */

export type SubscriptionPaymentType = "SUBSCRIPTION" | "RENEW" | "ADDITION"
export type SubscriptionPaymentStatus = "APPROVED" | "DECLINED" | "ERROR" | "PENDING"
export type SubscriptionPaymentSort = "-created_at" | "created_at" | "price" | "-price"

export type SubscriptionPayment = {
  id: number
  created_at: string
  organization: NamedRef | null
  type: SubscriptionPaymentType | string
  status: SubscriptionPaymentStatus | string
  /** COP pesos. */
  price: number | null
  periods?: number | null
  plan?: NamedRef | null
  user?: NamedRef | null
}

export type SubscriptionPaymentTotals = {
  count?: number
  approved_total?: number
}

export type SubscriptionPaymentsPage = Paginated<SubscriptionPayment> & {
  totals?: SubscriptionPaymentTotals
}

export type SubscriptionPaymentFilters = {
  search?: string
  organization_id?: string
  status?: SubscriptionPaymentStatus | ""
  type?: SubscriptionPaymentType | ""
  from?: string
  to?: string
  sort?: SubscriptionPaymentSort
  per_page?: number
  page?: number
}

export function subscriptionPaymentsKey(filters: SubscriptionPaymentFilters) {
  return withQuery("/staff/subscription-payments", filters)
}

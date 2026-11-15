import { withQuery } from "./client"
import type { Paginated } from "./organizations"

/*
 * Staff Wompi payments API (`/staff/subscription-payments`): subscription
 * payments and RellaCash credit purchases (RELLA_CASH_RECHARGE).
 */

type NamedRef = { id: number; name: string }

export type SubscriptionPaymentType = "SUBSCRIPTION" | "RENEW" | "ADDITION" | "RELLA_CASH_RECHARGE"
export type SubscriptionPaymentStatus = "APPROVED" | "DECLINED" | "ERROR" | "PENDING"
export type SubscriptionPaymentSort = "-created_at" | "created_at" | "price" | "-price"

export type SubscriptionPayment = {
  id: number
  created_at: string
  organization: NamedRef | null
  type: SubscriptionPaymentType | string
  type_label?: string | null
  status: SubscriptionPaymentStatus | string
  status_label?: string | null
  /** COP pesos. */
  price: number | null
  periods?: number | null
  plan?: NamedRef | null
  user?: NamedRef | null
  /*
   * Wompi fees (COP, up to 2 decimals); null unless APPROVED.
   * Costo Wompi = commission (2.65% + 700) + 19% VAT; withholding (retención,
   * 1.5% of gross) is a tax credit, not a cost.
   */
  wompi_commission?: number | null
  wompi_vat?: number | null
  /** `wompi_commission + wompi_vat`. */
  wompi_fee?: number | null
  withholding?: number | null
  /** `price − wompi_fee` (real income). */
  net?: number | null
  /** `net − withholding` (what reaches the bank). */
  deposited?: number | null
}

/** Money totals cover APPROVED payments only. */
export type SubscriptionPaymentTotals = {
  count: number
  approved_total: number
  wompi_fee_total?: number
  withholding_total?: number
  net_total?: number
  deposited_total?: number
}

export type SubscriptionPaymentsPage = Paginated<SubscriptionPayment> & {
  totals: SubscriptionPaymentTotals
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

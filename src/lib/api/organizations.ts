import { api, withQuery } from "./client"

export type OrganizationStatus = "active" | "expiring" | "expired" | "none"

/** List filter: the subscription statuses plus soft-deleted organizations. */
export type OrganizationStatusFilter = OrganizationStatus | "deleted"

export type Plan = {
  id: number
  name: string
  slug: string
  price: number
  periodicity: number
  periodicity_type: "Day" | "Week" | "Month" | "Year" | string
}

export type OrganizationOwner = {
  id: number
  name: string
  email: string
  phone: string | null
}

export type OrganizationRow = {
  id: number
  name: string
  phone: string | null
  created_at: string
  owner: OrganizationOwner | null
  plan: Plan | null
  status: OrganizationStatus
  /** null with a plan = lifetime plan. */
  expires_at: string | null
  days_left: number | null
  users_count: number
  channels_count: number
  rellacash_balance: number
  /** Set when soft-deleted; the organization is purged at `purge_at`. */
  deleted_at: string | null
  purge_at: string | null
}

export type CurrentSubscription = {
  id: number
  plan: Plan
  status: string
  renewal_status: "active" | "past_due" | "suspended" | "expired" | string
  started_at: string | null
  expires_at: string | null
  auto_renew: boolean
  grace_ends_at: string | null
  suspended_at: string | null
}

export type SubscriptionHistoryItem = {
  id: number
  plan: Plan
  status: "active" | "cancelled" | "suppressed" | string
  started_at: string | null
  expires_at: string | null
  cancelled_at: string | null
  created_at: string
}

export type PaymentType = "SUBSCRIPTION" | "RENEW" | "ADDITION" | "RELLA_CASH_RECHARGE"
export type PaymentStatus = "APPROVED" | "DECLINED" | "ERROR" | "PENDING"

export type Payment = {
  id: number
  type: PaymentType | string
  status: PaymentStatus | string
  amount: number
  periods: number | null
  plan: { id: number; name: string } | null
  created_at: string
}

export type AuditEntry = {
  id: number
  action: string
  reason: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  staff: { id: number; name: string } | null
  created_at: string
}

export type OrganizationDetail = OrganizationRow & {
  subscription: CurrentSubscription | null
  subscriptions: SubscriptionHistoryItem[]
  payments: Payment[]
  audit: AuditEntry[]
}

export type Paginated<T> = {
  data: T[]
  links: { first: string | null; last: string | null; prev: string | null; next: string | null }
  meta: {
    current_page: number
    from: number | null
    last_page: number
    path: string
    per_page: number
    to: number | null
    total: number
  }
}

export type OrganizationSort =
  | "name"
  | "-name"
  | "created_at"
  | "-created_at"
  | "expires_at"
  | "-expires_at"

export type OrganizationFilters = {
  search?: string
  plan?: string
  status?: OrganizationStatusFilter | ""
  created_from?: string
  created_to?: string
  sort?: OrganizationSort
  per_page?: number
  page?: number
}

export function organizationsKey(filters: OrganizationFilters) {
  return withQuery("/staff/organizations", filters)
}

export function organizationKey(id: number | string) {
  return `/staff/organizations/${id}`
}

export type ExtendPayload =
  | { days: number; reason: string }
  | { until: string; reason: string }

export async function extendOrganization(
  id: number | string,
  payload: ExtendPayload
): Promise<OrganizationDetail> {
  const { data } = await api.post<{ data: OrganizationDetail }>(
    `/staff/organizations/${id}/extend`,
    payload
  )
  return data.data
}

/** Gifted (promotional) RellaCash credits; `amount` in COP pesos, 1.000–1.000.000. */
export type GiftCreditsPayload = { amount: number; reason: string }

export const GIFT_MIN_AMOUNT = 1000
export const GIFT_MAX_AMOUNT = 1000000

/** Gifts promotional RellaCash credits; they are not counted as revenue. */
export async function giftCredits(
  id: number | string,
  payload: GiftCreditsPayload
): Promise<OrganizationDetail> {
  const { data } = await api.post<{ data: OrganizationDetail }>(
    `/staff/organizations/${id}/gift-credits`,
    payload
  )
  return data.data
}

export type DeletePayload ={ confirm_name: string; reason: string }

/** Soft-deletes the organization; it is purged permanently after the grace period. */
export async function deleteOrganization(
  id: number | string,
  payload: DeletePayload
): Promise<OrganizationDetail> {
  const { data } = await api.delete<{ data: OrganizationDetail }>(`/staff/organizations/${id}`, {
    data: payload,
  })
  return data.data
}

export async function restoreOrganization(
  id: number | string,
  payload: { reason: string }
): Promise<OrganizationDetail> {
  const { data } = await api.post<{ data: OrganizationDetail }>(
    `/staff/organizations/${id}/restore`,
    payload
  )
  return data.data
}

/** SWR key matcher for every organizations list page (any filters). */
export function isOrganizationsListKey(key: unknown) {
  return (
    typeof key === "string" &&
    (key === "/staff/organizations" || key.startsWith("/staff/organizations?"))
  )
}

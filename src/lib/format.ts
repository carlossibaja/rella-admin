import type { GroupBy } from "@/lib/api/metrics"

export const TIMEZONE = "America/Bogota"

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

const compactMoney = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
})

const integer = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 })

export function formatCOP(value: number | null | undefined) {
  return money.format(value ?? 0)
}

export function formatCOPCompact(value: number | null | undefined) {
  return compactMoney.format(value ?? 0)
}

export function formatNumber(value: number | null | undefined) {
  return integer.format(value ?? 0)
}

export function formatPct(value: number | null | undefined, withSign = false) {
  if (value === null || value === undefined) return "—"
  const sign = withSign && value > 0 ? "+" : ""
  return `${sign}${value.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`
}

/** ISO timestamp (UTC) shown as a Bogota date. */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-CO", { timeZone: TIMEZONE, dateStyle: "medium" }).format(
    new Date(iso)
  )
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

/** A local day label `Y-m-d` (already in Bogota time). */
function dayDate(day: string) {
  return new Date(`${day}T12:00:00Z`)
}

export function formatDay(day: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", ...options }).format(dayDate(day))
}

export function formatMonth(month: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    month: style,
    year: "numeric",
  }).format(dayDate(`${month}-01`))
}

/** Label for a metrics period depending on its grouping. */
export function formatPeriod(period: string, groupBy: GroupBy) {
  if (groupBy === "month") return formatMonth(period)
  if (groupBy === "week") return `Sem. ${formatDay(period)}`
  return formatDay(period)
}

/** Today in Bogota as `Y-m-d`. */
export function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
}

export function currentMonth() {
  return todayLocal().slice(0, 7)
}

/** Shift a `Y-m-d` by whole days. */
export function addDays(day: string, days: number) {
  const date = dayDate(day)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Shift a `Y-m` by whole months. */
export function addMonths(month: string, months: number) {
  const date = dayDate(`${month}-01`)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().slice(0, 7)
}

/** The last `count` months ending at the current month, newest first. */
export function recentMonths(count = 12) {
  const now = currentMonth()
  return Array.from({ length: count }, (_, i) => addMonths(now, -i))
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

/** ISO timestamp as a Bogota `Y-m-d`. */
export function localDay(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date(iso))
}

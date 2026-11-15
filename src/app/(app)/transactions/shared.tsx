"use client"

import { useEffect } from "react"
import Link from "next/link"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { withQuery } from "@/lib/api/client"
import { cn } from "@/lib/utils"

export const ALL = "all"
export const PER_PAGE = 25

export type QueryValues = Record<string, string | number | null | undefined>

/** Current `?query` of the page; empty during prerendering. */
export function readQuery() {
  return new URLSearchParams(typeof window === "undefined" ? "" : window.location.search)
}

/** A query value restricted to `allowed`, or `fallback`. */
export function pick<T extends string>(query: URLSearchParams, key: string, allowed: readonly T[], fallback: T) {
  const value = query.get(key)
  return allowed.includes(value as T) ? (value as T) : fallback
}

/**
 * Mirrors the filters in the URL (`replaceState`, no navigation) so the view can
 * be shared or deep-linked. Empty values are dropped.
 */
export function useQuerySync(values: QueryValues) {
  const search = withQuery("", values)

  useEffect(() => {
    const { pathname } = window.location
    if (`${pathname}${search}` !== `${pathname}${window.location.search}`) {
      window.history.replaceState(null, "", `${pathname}${search}`)
    }
  }, [search])
}

export const MUTED_DASH = <span className="text-muted-foreground">—</span>

export function OrganizationLink({ organization }: { organization: { id: number; name: string } | null }) {
  if (!organization) return MUTED_DASH
  return (
    <Link href={`/organizations/${organization.id}`} className="font-medium hover:underline">
      {organization.name}
    </Link>
  )
}

/** Active `organization_id` filter (usually from a deep link), removable. */
export function OrganizationFilterChip({
  id,
  name,
  onClear,
}: {
  id: string
  name?: string
  onClear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Filtrando por empresa:</span>
      <Badge variant="secondary" className="gap-1 pr-1">
        <Link href={`/organizations/${id}`} className="hover:underline">
          {name ?? `#${id}`}
        </Link>
        <Button variant="ghost" size="icon-xs" className="size-4" onClick={onClear} aria-label="Quitar filtro de empresa">
          <X className="size-3" />
        </Button>
      </Badge>
    </div>
  )
}

export function DateRangeInputs({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (field: "from" | "to", value: string) => void
}) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="tx_from" className="text-xs text-muted-foreground">
          Desde
        </Label>
        <Input id="tx_from" type="date" value={from} onChange={(e) => onChange("from", e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tx_to" className="text-xs text-muted-foreground">
          Hasta
        </Label>
        <Input id="tx_to" type="date" value={to} onChange={(e) => onChange("to", e.target.value)} />
      </div>
    </>
  )
}

/** Signed amount: green for credits, red for debits. */
export function SignedAmount({ value, children }: { value: number | null | undefined; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        (value ?? 0) > 0 && "text-emerald-700 dark:text-emerald-400",
        (value ?? 0) < 0 && "text-red-700 dark:text-red-400"
      )}
    >
      {children}
    </span>
  )
}

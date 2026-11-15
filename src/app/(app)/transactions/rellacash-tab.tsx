"use client"

import { useState } from "react"
import { ArrowDownLeft, ArrowUpRight, Gift, Hash, Search, Server, Wallet, X } from "lucide-react"
import useSWR from "swr"

import { EmptyState, ErrorState } from "@/components/empty-state"
import { KpiCard } from "@/components/kpi-card"
import { SimplePagination } from "@/components/simple-pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDebounced } from "@/hooks/use-debounced"
import { errorMessage, fetchBody } from "@/lib/api/client"
import {
  fundingOf,
  rellaCashTransactionsKey,
  type RellaCashFunding,
  type RellaCashPage,
  type RellaCashSort,
  type RellaCashType,
} from "@/lib/api/transactions"
import { formatCOP, formatDateTime, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  ALL,
  DateRangeInputs,
  MUTED_DASH,
  OrganizationFilterChip,
  OrganizationLink,
  PER_PAGE,
  SignedAmount,
  pick,
  readQuery,
  useQuerySync,
} from "./shared"

const TYPE_LABELS: Record<RellaCashType, string> = {
  recharge: "Recarga",
  consumption: "Consumo",
  refund: "Reembolso",
  adjustment: "Ajuste",
}
const TYPES = Object.keys(TYPE_LABELS) as RellaCashType[]

/** Assumed ledger statuses; unknown values from the API are shown raw. */
const STATUS_LABELS: Record<string, string> = {
  completed: "Completada",
  pending: "Pendiente",
  failed: "Fallida",
  reversed: "Revertida",
}
const STATUSES = Object.keys(STATUS_LABELS)

const FUNDING: Record<RellaCashFunding, { label: string; className: string }> = {
  promo: { label: "Regalo", className: "bg-violet-500/12 text-violet-700 dark:text-violet-400" },
  paid: { label: "Pagado", className: "bg-sky-500/12 text-sky-700 dark:text-sky-400" },
  mixed: { label: "Mixto", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
}
const FUNDINGS = Object.keys(FUNDING) as RellaCashFunding[]

const SORTS: { value: RellaCashSort; label: string }[] = [
  { value: "-created_at", label: "Más recientes" },
  { value: "-amount", label: "Mayor monto" },
  { value: "amount", label: "Menor monto" },
]
const DEFAULT_SORT: RellaCashSort = "-created_at"

type Filters = {
  search: string
  organization_id: string
  type: RellaCashType | ""
  status: string
  concept: string
  funding: RellaCashFunding | ""
  from: string
  to: string
  sort: RellaCashSort
}

const EMPTY_FILTERS: Filters = {
  search: "",
  organization_id: "",
  type: "",
  status: "",
  concept: "",
  funding: "",
  from: "",
  to: "",
  sort: DEFAULT_SORT,
}

function initialFilters(): Filters {
  const query = readQuery()
  return {
    search: query.get("search") ?? "",
    organization_id: query.get("organization_id") ?? "",
    type: pick(query, "type", TYPES, ""),
    status: query.get("status") ?? "",
    concept: query.get("concept") ?? "",
    funding: pick(query, "funding", FUNDINGS, ""),
    from: query.get("from") ?? "",
    to: query.get("to") ?? "",
    sort: pick(query, "sort", SORTS.map((s) => s.value), DEFAULT_SORT),
  }
}

function initialPage() {
  return Math.max(1, Number(readQuery().get("page")) || 1)
}

export function RellaCashTab() {
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [page, setPage] = useState(initialPage)
  const search = useDebounced(filters.search.trim())
  const concept = useDebounced(filters.concept.trim())

  const params = {
    search,
    organization_id: filters.organization_id,
    type: filters.type,
    status: filters.status,
    concept,
    funding: filters.funding,
    from: filters.from,
    to: filters.to,
    sort: filters.sort,
  }

  useQuerySync({
    tab: "rellacash",
    ...params,
    sort: params.sort === DEFAULT_SORT ? undefined : params.sort,
    page: page > 1 ? page : undefined,
  })

  const { data, error, isLoading, isValidating, mutate } = useSWR<RellaCashPage>(
    rellaCashTransactionsKey({ ...params, page, per_page: PER_PAGE }),
    fetchBody
  )

  function update<K extends keyof Filters>(field: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [field]: value }))
    setPage(1)
  }

  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)
  const rows = data?.data ?? []
  const totals = data?.totals
  const loadingTotals = isLoading && !data
  const filteredOrgName = rows.find((row) => String(row.organization?.id) === filters.organization_id)
    ?.organization?.name

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Transacciones"
          icon={Hash}
          loading={loadingTotals}
          value={formatNumber(totals?.count ?? data?.meta.total)}
        />
        <KpiCard label="Acreditado" icon={ArrowDownLeft} loading={loadingTotals} value={formatCOP(totals?.credited)} />
        <KpiCard
          label="Debitado"
          icon={ArrowUpRight}
          loading={loadingTotals}
          value={formatCOP(Math.abs(totals?.debited ?? 0))}
        />
        <KpiCard
          label="Regalo consumido"
          icon={Gift}
          loading={loadingTotals}
          value={formatCOP(Math.abs(totals?.promo_consumed ?? 0))}
        />
        <KpiCard
          label="Costo proveedor"
          icon={Server}
          loading={loadingTotals}
          value={formatCOP(totals?.provider_cost)}
        />
      </div>

      <Card className="py-4">
        <CardContent className="grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar empresa por nombre o ID…"
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
              aria-label="Buscar"
            />
          </div>
          <Select
            value={filters.type || ALL}
            onValueChange={(value) => update("type", value === ALL ? "" : (value as RellaCashType))}
          >
            <SelectTrigger className="w-full" aria-label="Tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status || ALL}
            onValueChange={(value) => update("status", value === ALL ? "" : value)}
          >
            <SelectTrigger className="w-full" aria-label="Estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.funding || ALL}
            onValueChange={(value) => update("funding", value === ALL ? "" : (value as RellaCashFunding))}
          >
            <SelectTrigger className="w-full" aria-label="Financiación">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Regalo y pagado</SelectItem>
              {FUNDINGS.map((funding) => (
                <SelectItem key={funding} value={funding}>
                  {FUNDING[funding].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            disabled={!dirty}
            onClick={() => {
              setFilters(EMPTY_FILTERS)
              setPage(1)
            }}
          >
            <X /> Limpiar
          </Button>
          <Input
            className="self-end"
            placeholder="Concepto (clave)"
            value={filters.concept}
            onChange={(e) => update("concept", e.target.value)}
            aria-label="Concepto"
          />
          <Select value={filters.sort} onValueChange={(value) => update("sort", value as RellaCashSort)}>
            <SelectTrigger className="w-full self-end" aria-label="Orden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((sort) => (
                <SelectItem key={sort.value} value={sort.value}>
                  {sort.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangeInputs from={filters.from} to={filters.to} onChange={update} />
        </CardContent>
      </Card>

      {filters.organization_id ? (
        <OrganizationFilterChip
          id={filters.organization_id}
          name={filteredOrgName}
          onClear={() => update("organization_id", "")}
        />
      ) : null}

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void mutate()} />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <div className={isValidating && data ? "opacity-70 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Fecha</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Costo proveedor</TableHead>
                  <TableHead className="pr-4 text-right">Saldo después</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !data
                  ? Array.from({ length: 8 }, (_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }, (_, j) => (
                          <TableCell key={j} className={j === 0 ? "pl-4" : undefined}>
                            <Skeleton className="h-5 w-full max-w-32" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.map((tx) => {
                      const funding = tx.type === "consumption" ? fundingOf(tx) : null
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="pl-4 whitespace-nowrap">{formatDateTime(tx.created_at)}</TableCell>
                          <TableCell>
                            <OrganizationLink organization={tx.organization} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{tx.type_label ?? TYPE_LABELS[tx.type as RellaCashType] ?? tx.type}</span>
                              {funding ? (
                                <Badge className={cn("border-transparent font-medium", FUNDING[funding].className)}>
                                  {FUNDING[funding].label}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="max-w-56 truncate">{tx.concept_label ?? tx.concept ?? "—"}</p>
                            {tx.description || tx.model ? (
                              <p className="max-w-56 truncate text-xs text-muted-foreground">
                                {[tx.description, tx.model].filter(Boolean).join(" · ")}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {tx.status ? (STATUS_LABELS[tx.status] ?? tx.status) : MUTED_DASH}
                          </TableCell>
                          <TableCell>
                            {tx.user ? <span className="max-w-40 truncate">{tx.user.name}</span> : MUTED_DASH}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <SignedAmount value={tx.amount}>
                              {tx.amount > 0 ? "+" : ""}
                              {formatCOP(tx.amount)}
                            </SignedAmount>
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap">
                            {tx.provider_cost === null || tx.provider_cost === undefined
                              ? MUTED_DASH
                              : formatCOP(tx.provider_cost)}
                          </TableCell>
                          <TableCell className="pr-4 text-right tabular-nums whitespace-nowrap">
                            {tx.balance_after === null || tx.balance_after === undefined
                              ? MUTED_DASH
                              : formatCOP(tx.balance_after)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
            {!isLoading && rows.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No hay transacciones con estos filtros"
                description="Prueba con otra búsqueda o limpia los filtros."
              />
            ) : null}
          </div>
          {data && data.meta.total > 0 ? (
            <div className="border-t px-4 py-3">
              <SimplePagination
                page={data.meta.current_page}
                lastPage={data.meta.last_page}
                from={data.meta.from}
                to={data.meta.to}
                total={data.meta.total}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </Card>
      )}
    </>
  )
}

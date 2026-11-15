"use client"

import { useState } from "react"
import { BadgeCheck, CreditCard, Hash, Search, X } from "lucide-react"
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
  subscriptionPaymentsKey,
  type SubscriptionPaymentSort,
  type SubscriptionPaymentStatus,
  type SubscriptionPaymentType,
  type SubscriptionPaymentsPage,
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
  pick,
  readQuery,
  useQuerySync,
} from "./shared"

const TYPE_LABELS: Record<SubscriptionPaymentType, string> = {
  SUBSCRIPTION: "Suscripción",
  RENEW: "Renovación",
  ADDITION: "Adición",
  RELLA_CASH_RECHARGE: "Recarga RellaCash",
}
const TYPES = Object.keys(TYPE_LABELS) as SubscriptionPaymentType[]

const STATUS: Record<SubscriptionPaymentStatus, { label: string; className: string }> = {
  APPROVED: { label: "Aprobado", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  PENDING: { label: "Pendiente", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  DECLINED: { label: "Rechazado", className: "bg-red-500/12 text-red-700 dark:text-red-400" },
  ERROR: { label: "Error", className: "bg-red-500/12 text-red-700 dark:text-red-400" },
}
const STATUSES = Object.keys(STATUS) as SubscriptionPaymentStatus[]

const SORTS: { value: SubscriptionPaymentSort; label: string }[] = [
  { value: "-created_at", label: "Más recientes" },
  { value: "created_at", label: "Más antiguos" },
  { value: "-price", label: "Mayor valor" },
  { value: "price", label: "Menor valor" },
]
const DEFAULT_SORT: SubscriptionPaymentSort = "-created_at"

type Filters = {
  search: string
  organization_id: string
  status: SubscriptionPaymentStatus | ""
  type: SubscriptionPaymentType | ""
  from: string
  to: string
  sort: SubscriptionPaymentSort
}

const EMPTY_FILTERS: Filters = {
  search: "",
  organization_id: "",
  status: "",
  type: "",
  from: "",
  to: "",
  sort: DEFAULT_SORT,
}

function initialFilters(): Filters {
  const query = readQuery()
  return {
    search: query.get("search") ?? "",
    organization_id: query.get("organization_id") ?? "",
    status: pick(query, "status", STATUSES, ""),
    type: pick(query, "type", TYPES, ""),
    from: query.get("from") ?? "",
    to: query.get("to") ?? "",
    sort: pick(query, "sort", SORTS.map((s) => s.value), DEFAULT_SORT),
  }
}

function initialPage() {
  return Math.max(1, Number(readQuery().get("page")) || 1)
}

export function SubscriptionPaymentsTab() {
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [page, setPage] = useState(initialPage)
  const search = useDebounced(filters.search.trim())

  const params = {
    search,
    organization_id: filters.organization_id,
    status: filters.status,
    type: filters.type,
    from: filters.from,
    to: filters.to,
    sort: filters.sort,
  }

  useQuerySync({
    tab: "payments",
    ...params,
    sort: params.sort === DEFAULT_SORT ? undefined : params.sort,
    page: page > 1 ? page : undefined,
  })

  const { data, error, isLoading, isValidating, mutate } = useSWR<SubscriptionPaymentsPage>(
    subscriptionPaymentsKey({ ...params, page, per_page: PER_PAGE }),
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
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Pagos"
          icon={Hash}
          loading={loadingTotals}
          value={formatNumber(totals?.count)}
        />
        <KpiCard
          label="Total aprobado"
          icon={BadgeCheck}
          loading={loadingTotals}
          value={formatCOP(totals?.approved_total)}
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
            onValueChange={(value) => update("type", value === ALL ? "" : (value as SubscriptionPaymentType))}
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
            onValueChange={(value) => update("status", value === ALL ? "" : (value as SubscriptionPaymentStatus))}
          >
            <SelectTrigger className="w-full" aria-label="Estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.sort} onValueChange={(value) => update("sort", value as SubscriptionPaymentSort)}>
            <SelectTrigger className="w-full" aria-label="Orden">
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
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-right">Periodos</TableHead>
                  <TableHead className="pr-4 text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !data
                  ? Array.from({ length: 8 }, (_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }, (_, j) => (
                          <TableCell key={j} className={j === 0 ? "pl-4" : undefined}>
                            <Skeleton className="h-5 w-full max-w-32" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.map((payment) => {
                      const status = STATUS[payment.status as SubscriptionPaymentStatus]
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="pl-4 whitespace-nowrap">
                            {formatDateTime(payment.created_at)}
                          </TableCell>
                          <TableCell>
                            <OrganizationLink organization={payment.organization} />
                          </TableCell>
                          <TableCell>
                            {payment.type_label ?? TYPE_LABELS[payment.type as SubscriptionPaymentType] ?? payment.type}
                          </TableCell>
                          <TableCell>{payment.plan?.name ?? MUTED_DASH}</TableCell>
                          <TableCell>
                            <Badge className={cn("border-transparent font-medium", status?.className)}>
                              {payment.status_label ?? status?.label ?? payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.user?.name ?? MUTED_DASH}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {payment.periods === null || payment.periods === undefined
                              ? MUTED_DASH
                              : formatNumber(payment.periods)}
                          </TableCell>
                          <TableCell className="pr-4 text-right tabular-nums whitespace-nowrap">
                            {payment.price === null || payment.price === undefined
                              ? MUTED_DASH
                              : formatCOP(payment.price)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
            {!isLoading && rows.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No hay pagos con estos filtros"
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

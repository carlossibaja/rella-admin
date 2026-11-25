"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Mail, Search, X } from "lucide-react"
import useSWR from "swr"

import { EmptyState, ErrorState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { SimplePagination } from "@/components/simple-pagination"
import { STATUS_LABELS, StatusBadge, organizationStatus } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  organizationsKey,
  type OrganizationRow,
  type OrganizationSort,
  type OrganizationStatusFilter,
  type Paginated,
} from "@/lib/api/organizations"
import { formatCOP, formatDate, formatDateTime, formatNumber } from "@/lib/format"
import { planPeriod } from "@/lib/plan"

import { SendEmailDialog } from "./send-email-dialog"

const ALL = "all"
const STATUSES = Object.keys(STATUS_LABELS) as OrganizationStatusFilter[]

const SORTS: { value: OrganizationSort; label: string }[] = [
  { value: "-created_at", label: "Más recientes" },
  { value: "created_at", label: "Más antiguas" },
  { value: "expires_at", label: "Vencen primero" },
  { value: "-expires_at", label: "Vencen último" },
  { value: "name", label: "Nombre (A–Z)" },
  { value: "-name", label: "Nombre (Z–A)" },
]

type Filters = {
  search: string
  plan: string
  status: OrganizationStatusFilter | ""
  created_from: string
  created_to: string
  sort: OrganizationSort
}

const EMPTY_FILTERS: Filters = {
  search: "",
  plan: "",
  status: "",
  created_from: "",
  created_to: "",
  sort: "-created_at",
}

/** Initial status from `?status=` (links from the dashboard). */
function initialFilters(): Filters {
  if (typeof window === "undefined") return EMPTY_FILTERS
  const status = new URLSearchParams(window.location.search).get("status")
  return STATUSES.includes(status as OrganizationStatusFilter)
    ? { ...EMPTY_FILTERS, status: status as OrganizationStatusFilter, sort: "expires_at" }
    : EMPTY_FILTERS
}

export default function OrganizationsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [page, setPage] = useState(1)
  const [emailTo, setEmailTo] = useState<OrganizationRow | null>(null)
  const search = useDebounced(filters.search.trim())
  const plan = useDebounced(filters.plan.trim())

  const key = organizationsKey({
    search,
    plan,
    status: filters.status,
    created_from: filters.created_from,
    created_to: filters.created_to,
    sort: filters.sort,
    page,
    per_page: 25,
  })
  const { data, error, isLoading, isValidating, mutate } = useSWR<Paginated<OrganizationRow>>(
    key,
    fetchBody
  )

  function update<K extends keyof Filters>(field: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [field]: value }))
    setPage(1)
  }

  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)
  const rows = data?.data ?? []

  return (
    <>
      <PageHeader
        title="Empresas"
        description={
          data ? `${formatNumber(data.meta.total)} empresas encontradas` : "Todas las empresas de RellaChat"
        }
      />

      <Card className="py-4">
        <CardContent className="grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, teléfono o correo…"
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
              aria-label="Buscar"
            />
          </div>
          <Select
            value={filters.status || ALL}
            onValueChange={(value) => update("status", value === ALL ? "" : (value as OrganizationStatusFilter))}
          >
            <SelectTrigger className="w-full" aria-label="Estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "deleted" ? "Eliminadas" : STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Plan (slug)"
            value={filters.plan}
            onChange={(e) => update("plan", e.target.value)}
            aria-label="Plan"
          />
          <Select value={filters.sort} onValueChange={(value) => update("sort", value as OrganizationSort)}>
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
          <div className="grid gap-1.5 sm:col-span-1 lg:col-span-1">
            <Label htmlFor="created_from" className="text-xs text-muted-foreground">
              Creada desde
            </Label>
            <Input
              id="created_from"
              type="date"
              value={filters.created_from}
              onChange={(e) => update("created_from", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="created_to" className="text-xs text-muted-foreground">
              Creada hasta
            </Label>
            <Input
              id="created_to"
              type="date"
              value={filters.created_to}
              onChange={(e) => update("created_to", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void mutate()} />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <div className={isValidating && data ? "opacity-70 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Empresa</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Usuarios</TableHead>
                  <TableHead className="text-right">Canales</TableHead>
                  <TableHead className="text-right">Saldo RellaCash</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
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
                  : rows.map((org) => (
                      <TableRow
                        key={org.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/organizations/${org.id}`)}
                      >
                        <TableCell className="pl-4">
                          <Link
                            href={`/organizations/${org.id}`}
                            className="font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {org.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Creada {formatDate(org.created_at)}
                          </p>
                        </TableCell>
                        <TableCell>
                          {org.owner ? (
                            <>
                              <p className="max-w-48 truncate">{org.owner.name}</p>
                              <p className="max-w-48 truncate text-xs text-muted-foreground">
                                {org.owner.email}
                              </p>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {org.plan ? (
                            <div className="leading-tight">
                              <div>{org.plan.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatCOP(org.plan.price)}
                                {planPeriod(org.plan)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={organizationStatus(org)} daysLeft={org.days_left} />
                          {org.deleted_at ? (
                            <p className="mt-1 text-xs whitespace-nowrap text-red-700 dark:text-red-400">
                              Se borra el {formatDateTime(org.purge_at)}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {org.plan && !org.expires_at ? "De por vida" : formatDate(org.expires_at)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(org.users_count)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(org.channels_count)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCOP(org.rellacash_balance)}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={Boolean(org.deleted_at)}
                            title={org.deleted_at ? "La empresa está eliminada" : undefined}
                            onClick={(e) => {
                              e.stopPropagation()
                              setEmailTo(org)
                            }}
                          >
                            <Mail /> Enviar email
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            {!isLoading && rows.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No hay empresas con estos filtros"
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

      <SendEmailDialog organization={emailTo} onOpenChange={(open) => !open && setEmailTo(null)} />
    </>
  )
}

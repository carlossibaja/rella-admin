"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarClock,
  History,
  Mail,
  Phone,
  Radio,
  Receipt,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react"
import useSWR from "swr"

import { EmptyState, ErrorState } from "@/components/empty-state"
import { StatusBadge, organizationStatus } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { errorMessage } from "@/lib/api/client"
import { organizationKey, type OrganizationDetail } from "@/lib/api/organizations"
import { planPeriod } from "@/lib/plan"
import { formatCOP, formatDate, formatDateTime, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { DeleteDialog, RestoreDialog } from "./deletion-dialogs"
import { ExtendDialog } from "./extend-dialog"
import { GiftCreditsDialog } from "./gift-credits-dialog"
import { SentEmailsCard } from "./sent-emails-card"

const PAYMENT_TYPES: Record<string, string> = {
  SUBSCRIPTION: "Suscripción",
  RENEW: "Renovación",
  ADDITION: "Adición",
  RELLA_CASH_RECHARGE: "Recarga RellaCash",
}

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Aprobado", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  PENDING: { label: "Pendiente", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  DECLINED: { label: "Rechazado", className: "bg-red-500/12 text-red-700 dark:text-red-400" },
  ERROR: { label: "Error", className: "bg-red-500/12 text-red-700 dark:text-red-400" },
}

const SUBSCRIPTION_STATUS: Record<string, string> = {
  active: "Activa",
  cancelled: "Cancelada",
  suppressed: "Reemplazada",
}

const RENEWAL_STATUS: Record<string, string> = {
  active: "Al día",
  past_due: "En mora",
  suspended: "Suspendida",
  expired: "Vencida",
}

const AUDIT_ACTIONS: Record<string, string> = {
  "subscription.extend": "Extensión de vencimiento",
  "organization.delete": "Eliminación de la empresa",
  "organization.restore": "Restauración de la empresa",
  "rellacash.gift": "Créditos regalados",
}

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, error, isLoading, mutate } = useSWR<OrganizationDetail>(organizationKey(id))

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href="/organizations">
            <ArrowLeft /> Empresas
          </Link>
        </Button>
      </div>

      {error && !data ? (
        <ErrorState
          message={
            (error as { response?: { status?: number } }).response?.status === 404
              ? "La empresa no existe."
              : errorMessage(error)
          }
          onRetry={() => void mutate()}
        />
      ) : isLoading || !data ? (
        <DetailSkeleton />
      ) : (
        <>
          {data.deleted_at ? (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-800 sm:flex-row sm:items-center sm:justify-between dark:text-red-300"
            >
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    Empresa eliminada — se borrará definitivamente el {formatDateTime(data.purge_at)}
                  </p>
                  <p className="text-sm opacity-90">
                    Eliminada el {formatDateTime(data.deleted_at)}. Puedes restaurarla hasta esa fecha.
                  </p>
                </div>
              </div>
              <RestoreDialog
                organization={data}
                onRestored={(detail) => void mutate(detail, { revalidate: false })}
              />
            </div>
          ) : null}

          <Card>
            <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
                  <StatusBadge status={organizationStatus(data)} daysLeft={data.days_left} />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  {data.owner ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="size-4" /> {data.owner.name} · {data.owner.email}
                    </span>
                  ) : null}
                  {data.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-4" /> {data.phone}
                    </span>
                  ) : null}
                  <span>Creada el {formatDate(data.created_at)}</span>
                  <span>ID #{data.id}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/transactions?organization_id=${data.id}`}>
                    <ArrowLeftRight /> Ver transacciones
                  </Link>
                </Button>
                {data.deleted_at ? null : (
                  <>
                    <GiftCreditsDialog
                      organization={data}
                      onGifted={(detail) => void mutate(detail, { revalidate: false })}
                    />
                    <ExtendDialog
                      organization={data}
                      onExtended={(detail) => void mutate(detail, { revalidate: false })}
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={CalendarClock} label="Vence">
              {data.plan && !data.expires_at ? "De por vida" : formatDate(data.expires_at)}
              {data.days_left !== null ? (
                <span className="block text-xs font-normal text-muted-foreground">
                  {data.days_left >= 0
                    ? `${formatNumber(data.days_left)} días restantes`
                    : `Venció hace ${formatNumber(Math.abs(data.days_left))} días`}
                </span>
              ) : null}
            </Stat>
            <Stat icon={Users} label="Usuarios">
              {formatNumber(data.users_count)}
            </Stat>
            <Stat icon={Radio} label="Canales">
              {formatNumber(data.channels_count)}
            </Stat>
            <Stat icon={Wallet} label="Saldo RellaCash">
              {formatCOP(data.rellacash_balance)}
            </Stat>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Suscripción actual</CardTitle>
              </CardHeader>
              <CardContent>
                {data.subscription ? (
                  <dl className="grid gap-3 text-sm">
                    <Field label="Plan">
                      {data.subscription.plan.name}{" "}
                      <span className="text-muted-foreground">
                        {formatCOP(data.subscription.plan.price)}
                        {planPeriod(data.subscription.plan)}
                      </span>
                    </Field>
                    <Field label="Renovación">
                      {RENEWAL_STATUS[data.subscription.renewal_status] ??
                        data.subscription.renewal_status}
                    </Field>
                    <Field label="Inicio">{formatDate(data.subscription.started_at)}</Field>
                    <Field label="Vence">
                      {data.subscription.expires_at
                        ? formatDateTime(data.subscription.expires_at)
                        : "De por vida"}
                    </Field>
                    <Field label="Renovación automática">
                      {data.subscription.auto_renew ? "Sí" : "No"}
                    </Field>
                    {data.subscription.grace_ends_at ? (
                      <Field label="Fin de gracia">{formatDateTime(data.subscription.grace_ends_at)}</Field>
                    ) : null}
                    {data.subscription.suspended_at ? (
                      <Field label="Suspendida">{formatDateTime(data.subscription.suspended_at)}</Field>
                    ) : null}
                  </dl>
                ) : (
                  <EmptyState
                    className="py-6"
                    icon={CalendarClock}
                    title="Sin suscripción activa"
                    description="Al extender se crea una nueva suscripción."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Historial de suscripciones</CardTitle>
                <CardDescription>De la más reciente a la más antigua</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {data.subscriptions.length === 0 ? (
                  <EmptyState className="py-6" icon={History} title="Sin suscripciones" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Plan</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead className="pr-6">Vence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="pl-6 font-medium">{sub.plan.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={sub.status === "active" ? "default" : "outline"}
                              className={cn(sub.status === "active" && "bg-primary/10 text-primary")}
                            >
                              {SUBSCRIPTION_STATUS[sub.status] ?? sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(sub.started_at ?? sub.created_at)}</TableCell>
                          <TableCell className="pr-6">
                            {sub.expires_at ? formatDate(sub.expires_at) : "De por vida"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Pagos recientes</CardTitle>
                <CardDescription>Últimos 20 pagos</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {data.payments.length === 0 ? (
                  <EmptyState className="py-6" icon={Receipt} title="Sin pagos registrados" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="pr-6 text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.payments.map((payment) => {
                        const status = PAYMENT_STATUS[payment.status]
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="pl-6 whitespace-nowrap">
                              {formatDateTime(payment.created_at)}
                            </TableCell>
                            <TableCell>
                              {PAYMENT_TYPES[payment.type] ?? payment.type}
                              {payment.plan ? (
                                <span className="block text-xs text-muted-foreground">
                                  {payment.plan.name}
                                  {payment.periods && payment.periods > 1 ? ` · ${payment.periods} periodos` : ""}
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("border-transparent", status?.className)}>
                                {status?.label ?? payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-6 text-right font-medium tabular-nums">
                              {formatCOP(payment.amount)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Auditoría</CardTitle>
                <CardDescription>Cambios hechos por el staff</CardDescription>
              </CardHeader>
              <CardContent>
                {data.audit.length === 0 ? (
                  <EmptyState className="py-6" icon={History} title="Sin cambios registrados" />
                ) : (
                  <ol className="relative grid gap-5 border-l pl-5">
                    {data.audit.map((entry) => (
                      <li key={entry.id} className="relative">
                        <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-primary" />
                        <p className="text-sm font-medium">
                          {AUDIT_ACTIONS[entry.action] ?? entry.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.staff?.name ?? "Staff"} · {formatDateTime(entry.created_at)}
                        </p>
                        <AuditChange before={entry.before} after={entry.after} />
                        {entry.reason ? (
                          <p className="mt-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-sm">
                            {entry.reason}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>

          <SentEmailsCard organizationId={data.id} />

          {data.deleted_at ? null : (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-destructive">Zona de peligro</CardTitle>
                <CardDescription>
                  Eliminar la empresa la desactiva de inmediato y borra todos sus datos en 7 días.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeleteDialog
                  organization={data}
                  onDeleted={(detail) => void mutate(detail, { revalidate: false })}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  )
}

function AuditChange({
  before,
  after,
}: {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}) {
  const gift = giftChange(before, after)
  if (gift) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {gift.amount !== null ? (
          <>
            Monto: <span className="font-medium text-foreground">{formatCOP(gift.amount)}</span>
          </>
        ) : null}
        {gift.amount !== null && gift.to !== null ? " · " : null}
        {gift.to !== null ? (
          <>
            Saldo: {gift.from !== null ? formatCOP(gift.from) : "—"} →{" "}
            <span className="font-medium text-foreground">{formatCOP(gift.to)}</span>
          </>
        ) : null}
      </p>
    )
  }
  const from = typeof before?.expires_at === "string" ? before.expires_at : null
  const to = typeof after?.expires_at === "string" ? after.expires_at : null
  if (!to) return null
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      Vencimiento: {from ? formatDate(from) : "—"} → <span className="font-medium text-foreground">{formatDate(to)}</span>
    </p>
  )
}

/** Amount and balance change of a `rellacash.gift` entry, read defensively from before/after. */
function giftChange(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
) {
  const num = (value: unknown) => (typeof value === "number" ? value : null)
  const from = num(before?.rellacash_balance) ?? num(before?.balance)
  const to = num(after?.rellacash_balance) ?? num(after?.balance)
  const amount = num(after?.amount) ?? (from !== null && to !== null ? to - from : null)
  if (amount === null && to === null) return null
  return { amount, from, to }
}

function Stat({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <Card className="py-5">
      <CardContent className="flex items-start gap-3 px-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{children}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Separator className="opacity-0" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      </div>
    </div>
  )
}

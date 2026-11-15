"use client"

import { useState } from "react"
import { CalendarPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage, fieldErrors } from "@/lib/api/client"
import {
  extendOrganization,
  type ExtendPayload,
  type OrganizationDetail,
} from "@/lib/api/organizations"
import { addDays, formatDate, localDay, todayLocal } from "@/lib/format"
import { cn } from "@/lib/utils"

const QUICK_DAYS = [7, 15, 30, 90]

export function ExtendDialog({
  organization,
  onExtended,
}: {
  organization: OrganizationDetail
  onExtended: (detail: OrganizationDetail) => void
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"days" | "until">("days")
  const [days, setDays] = useState("30")
  const [until, setUntil] = useState("")
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const lifetime = Boolean(organization.subscription && !organization.subscription.expires_at)
  const currentExpiry = organization.subscription?.expires_at ?? null
  const expiryDay = currentExpiry ? localDay(currentExpiry) : null
  const today = todayLocal()
  const minUntil = addDays(expiryDay && expiryDay > today ? expiryDay : today, 1)

  const daysNumber = Number(days)
  const daysValid = Number.isInteger(daysNumber) && daysNumber >= 1 && daysNumber <= 365
  const valid =
    reason.trim().length >= 3 && (mode === "days" ? daysValid : Boolean(until) && until >= minUntil)

  function reset() {
    setMode("days")
    setDays("30")
    setUntil("")
    setReason("")
    setErrors({})
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) return
    setSaving(true)
    setErrors({})
    const payload: ExtendPayload =
      mode === "days" ? { days: daysNumber, reason: reason.trim() } : { until, reason: reason.trim() }
    try {
      const detail = await extendOrganization(organization.id, payload)
      onExtended(detail)
      toast.success("Vencimiento extendido", {
        description: `Nueva fecha: ${formatDate(detail.expires_at)}`,
      })
      setOpen(false)
      reset()
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(fields)
      if (!Object.keys(fields).length) toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={lifetime} title={lifetime ? "El plan es de por vida" : undefined}>
          <CalendarPlus /> Extender vencimiento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Extender vencimiento</DialogTitle>
            <DialogDescription>
              {organization.name} ·{" "}
              {currentExpiry
                ? `vence el ${formatDate(currentExpiry)}`
                : "sin suscripción activa (se creará una nueva)"}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
            <TabsList className="w-full">
              <TabsTrigger value="days">Agregar días</TabsTrigger>
              <TabsTrigger value="until">Hasta una fecha</TabsTrigger>
            </TabsList>
            <TabsContent value="days" className="grid gap-3 pt-3">
              <div className="flex flex-wrap gap-2">
                {QUICK_DAYS.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn(
                      "rounded-full",
                      days === String(value) && "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                    )}
                    onClick={() => setDays(String(value))}
                  >
                    {value} días
                  </Button>
                ))}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="days">Días</Label>
                <Input
                  id="days"
                  type="number"
                  min={1}
                  max={365}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  aria-invalid={Boolean(errors.days) || (days !== "" && !daysValid)}
                />
                {errors.days ? (
                  <p className="text-sm text-destructive">{errors.days}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Se suman a la fecha actual de vencimiento (o a hoy si ya venció). Máximo 365.
                  </p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="until" className="grid gap-2 pt-3">
              <Label htmlFor="until">Nueva fecha de vencimiento</Label>
              <Input
                id="until"
                type="date"
                min={minUntil}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                aria-invalid={Boolean(errors.until)}
              />
              {errors.until ? (
                <p className="text-sm text-destructive">{errors.until}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Debe ser posterior a hoy y al vencimiento actual.
                </p>
              )}
            </TabsContent>
          </Tabs>

          <div className="grid gap-2">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              placeholder="Ej.: compensación por caída del servicio, acuerdo comercial…"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={Boolean(errors.reason)}
              rows={3}
            />
            {errors.reason ? (
              <p className="text-sm text-destructive">{errors.reason}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Obligatorio. Queda registrado en la auditoría.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Extender
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

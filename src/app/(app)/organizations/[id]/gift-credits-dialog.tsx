"use client"

import { useState } from "react"
import { Gift, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useSWRConfig } from "swr"

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
import { Textarea } from "@/components/ui/textarea"
import { errorMessage, fieldErrors } from "@/lib/api/client"
import {
  GIFT_MAX_AMOUNT,
  GIFT_MIN_AMOUNT,
  giftCredits,
  isOrganizationsListKey,
  type OrganizationDetail,
} from "@/lib/api/organizations"
import { formatCOP } from "@/lib/format"
import { cn } from "@/lib/utils"

const QUICK_AMOUNTS = [5000, 10000, 20000]

export function GiftCreditsDialog({
  organization,
  onGifted,
}: {
  organization: OrganizationDetail
  onGifted: (detail: OrganizationDetail) => void
}) {
  const { mutate } = useSWRConfig()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("10000")
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const amountNumber = Number(amount)
  const amountValid =
    amount !== "" && amountNumber >= GIFT_MIN_AMOUNT && amountNumber <= GIFT_MAX_AMOUNT
  const valid = amountValid && reason.trim().length >= 3

  function reset() {
    setAmount("10000")
    setReason("")
    setErrors({})
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) return
    setSaving(true)
    setErrors({})
    try {
      const detail = await giftCredits(organization.id, {
        amount: amountNumber,
        reason: reason.trim(),
      })
      onGifted(detail)
      void mutate(isOrganizationsListKey)
      toast.success(`Se regalaron ${formatCOP(amountNumber)} a ${organization.name}`, {
        description: `Nuevo saldo RellaCash: ${formatCOP(detail.rellacash_balance)}`,
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
        <Button variant="outline">
          <Gift /> Regalar créditos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Regalar créditos</DialogTitle>
            <DialogDescription>
              {organization.name} · saldo actual {formatCOP(organization.rellacash_balance)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "rounded-full",
                    amount === String(value) &&
                      "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                  onClick={() => setAmount(String(value))}
                >
                  {formatCOP(value)}
                </Button>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gift-amount">Monto (COP)</Label>
              <Input
                id="gift-amount"
                inputMode="numeric"
                autoComplete="off"
                placeholder="10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 7))}
                aria-invalid={Boolean(errors.amount) || (amount !== "" && !amountValid)}
              />
              {errors.amount ? (
                <p className="text-sm text-destructive">{errors.amount}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {amountValid ? `${formatCOP(amountNumber)} · ` : ""}Entre{" "}
                  {formatCOP(GIFT_MIN_AMOUNT)} y {formatCOP(GIFT_MAX_AMOUNT)}.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gift-reason">Motivo</Label>
            <Textarea
              id="gift-reason"
              placeholder="Ej.: compensación por falla, cortesía comercial…"
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

          <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Los créditos regalados no cuentan como ingreso; su costo se muestra en Ganancia IA como
            regalo consumido.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Regalar {amountValid ? formatCOP(amountNumber) : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { Loader2, RotateCcw, Trash2 } from "lucide-react"
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
  deleteOrganization,
  isOrganizationsListKey,
  restoreOrganization,
  type OrganizationDetail,
} from "@/lib/api/organizations"
import { formatDateTime } from "@/lib/format"

/** Refreshes every cached organizations list so the change shows up there too. */
function useRevalidateLists() {
  const { mutate } = useSWRConfig()
  return () => void mutate(isOrganizationsListKey)
}

function ReasonField({
  value,
  onChange,
  error,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="reason">Motivo</Label>
      <Textarea
        id="reason"
        placeholder={placeholder}
        value={value}
        maxLength={500}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        rows={3}
      />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Obligatorio. Queda registrado en la auditoría.</p>
      )}
    </div>
  )
}

export function DeleteDialog({
  organization,
  onDeleted,
}: {
  organization: OrganizationDetail
  onDeleted: (detail: OrganizationDetail) => void
}) {
  const revalidateLists = useRevalidateLists()
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState("")
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const nameMatches = confirmName === organization.name
  const valid = nameMatches && reason.trim().length >= 3

  function reset() {
    setConfirmName("")
    setReason("")
    setErrors({})
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) return
    setSaving(true)
    setErrors({})
    try {
      const detail = await deleteOrganization(organization.id, {
        confirm_name: confirmName,
        reason: reason.trim(),
      })
      onDeleted(detail)
      revalidateLists()
      toast.success("Empresa eliminada", {
        description: `Se borrará definitivamente el ${formatDateTime(detail.purge_at)}`,
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
        <Button variant="destructive">
          <Trash2 /> Eliminar empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Eliminar {organization.name}</DialogTitle>
            <DialogDescription asChild>
              <div className="grid gap-2">
                <p>La empresa deja de funcionar de inmediato: nadie podrá ingresar ni usar sus canales.</p>
                <p>
                  Todos sus datos se borrarán <strong className="text-destructive">definitivamente en 7 días</strong>.
                  Hasta entonces puedes restaurarla.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="confirm_name">
              Escribe <span className="font-semibold">{organization.name}</span> para confirmar
            </Label>
            <Input
              id="confirm_name"
              autoComplete="off"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              aria-invalid={Boolean(errors.confirm_name) || (confirmName !== "" && !nameMatches)}
            />
            {errors.confirm_name ? (
              <p className="text-sm text-destructive">{errors.confirm_name}</p>
            ) : null}
          </div>

          <ReasonField
            value={reason}
            onChange={setReason}
            error={errors.reason}
            placeholder="Ej.: solicitud del cliente, cuenta duplicada…"
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!valid || saving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="animate-spin" /> : null}
              Eliminar empresa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RestoreDialog({
  organization,
  onRestored,
}: {
  organization: OrganizationDetail
  onRestored: (detail: OrganizationDetail) => void
}) {
  const revalidateLists = useRevalidateLists()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const valid = reason.trim().length >= 3

  function reset() {
    setReason("")
    setErrors({})
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) return
    setSaving(true)
    setErrors({})
    try {
      const detail = await restoreOrganization(organization.id, { reason: reason.trim() })
      onRestored(detail)
      revalidateLists()
      toast.success("Empresa restaurada")
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
        <Button variant="outline" className="bg-background">
          <RotateCcw /> Restaurar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Restaurar {organization.name}</DialogTitle>
            <DialogDescription>
              La empresa vuelve a funcionar de inmediato y se cancela el borrado definitivo.
            </DialogDescription>
          </DialogHeader>

          <ReasonField
            value={reason}
            onChange={setReason}
            error={errors.reason}
            placeholder="Ej.: el cliente se arrepintió, eliminación por error…"
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Restaurar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

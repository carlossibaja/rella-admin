"use client"

import { useState } from "react"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { useSWRConfig } from "swr"

import { useStaff } from "@/components/auth/staff-context"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import {
  confirmTwoFactor,
  disableTwoFactor,
  enableTwoFactor,
  meKey,
  type TwoFactorSetup,
} from "@/lib/api/auth"
import { errorMessage, fieldErrors } from "@/lib/api/client"
import { formatDateTime } from "@/lib/format"

export default function AccountPage() {
  const staff = useStaff()

  return (
    <>
      <PageHeader title="Seguridad" description="Tu cuenta y la verificación en dos pasos." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cuenta</CardTitle>
            <CardDescription>Datos de tu usuario de staff.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="Nombre" value={staff.name} />
            <Row label="Correo" value={staff.email} />
            <Row label="Último ingreso" value={formatDateTime(staff.last_login_at)} />
          </CardContent>
        </Card>
        <TwoFactorCard enabled={staff.two_factor_enabled} />
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  )
}

function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const { mutate } = useSWRConfig()
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
      toast.success(success)
      return true
    } catch (err) {
      setError(fieldErrors(err).code ?? errorMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function start() {
    await run(async () => setSetup(await enableTwoFactor()), "Escanea el código en tu aplicación.")
  }

  async function confirm() {
    const ok = await run(async () => {
      const staff = await confirmTwoFactor(code)
      await mutate(meKey, staff, { revalidate: false })
    }, "Verificación en dos pasos activada.")
    if (ok) setSetup(null)
    setCode("")
  }

  async function disable() {
    await run(async () => {
      const staff = await disableTwoFactor(code)
      await mutate(meKey, staff, { revalidate: false })
    }, "Verificación en dos pasos desactivada.")
    setCode("")
  }

  const codeInput = (
    <div className="grid gap-2">
      <Label>Código de 6 dígitos</Label>
      <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={code} onChange={setCode}>
        <InputOTPGroup>
          {Array.from({ length: 6 }, (_, i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Verificación en dos pasos</CardTitle>
          {enabled ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              Activa
            </Badge>
          ) : (
            <Badge variant="outline">Inactiva</Badge>
          )}
        </div>
        <CardDescription>
          Pide un código TOTP (Google Authenticator, 1Password, Authy…) al iniciar sesión.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {enabled ? (
          <>
            <p className="text-sm text-muted-foreground">
              Para desactivarla, ingresa un código actual de tu aplicación.
            </p>
            {codeInput}
            <div>
              <Button variant="destructive" disabled={busy || code.length !== 6} onClick={disable}>
                {busy ? <Loader2 className="animate-spin" /> : <ShieldOff />}
                Desactivar
              </Button>
            </div>
          </>
        ) : setup ? (
          <>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Agrega una cuenta nueva en tu aplicación de autenticación.</li>
              <li>Pega esta clave (o abre el enlace desde tu teléfono).</li>
              <li>Ingresa el código que muestra la aplicación.</li>
            </ol>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md border bg-muted px-3 py-2 font-mono text-sm tracking-wider break-all">
                {setup.secret}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(setup.secret)
                    .then(() => toast.success("Clave copiada."))
                }}
              >
                <Copy /> Copiar
              </Button>
              <Button variant="link" size="sm" asChild>
                <a href={setup.otpauth_url}>Abrir en la aplicación</a>
              </Button>
            </div>
            {codeInput}
            <div>
              <Button disabled={busy || code.length !== 6} onClick={confirm}>
                {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Confirmar y activar
              </Button>
            </div>
          </>
        ) : (
          <>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div>
              <Button disabled={busy} onClick={start}>
                {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Activar verificación en dos pasos
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

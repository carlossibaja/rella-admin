"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { useToken } from "@/components/auth/use-token"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { isChallenge, login, verifyTwoFactor } from "@/lib/api/auth"
import { errorMessage, fieldErrors } from "@/lib/api/client"
import { TOKEN_PENDING } from "@/lib/api/token"

export function LoginForm() {
  const router = useRouter()
  const token = useToken()
  const [challenge, setChallenge] = useState<string | null>(null)

  useEffect(() => {
    if (token !== TOKEN_PENDING && token !== null) router.replace("/")
  }, [token, router])

  return challenge ? (
    <TwoFactorStep challenge={challenge} onBack={() => setChallenge(null)} />
  ) : (
    <CredentialsStep onChallenge={setChallenge} />
  )
}

function CredentialsStep({ onChallenge }: { onChallenge: (challenge: string) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      const response = await login(email.trim(), password)
      if (isChallenge(response)) onChallenge(response.challenge)
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(fields)
      if (!Object.keys(fields).length) toast.error(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="shadow-lg shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-xl">Iniciar sesión</CardTitle>
        <CardDescription>Acceso exclusivo para el equipo de Rella.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="nombre@rella.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              required
              autoFocus
            />
            {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              required
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password}</p>
            ) : null}
          </div>
          <Button type="submit" className="mt-2 w-full" disabled={submitting || !email || !password}>
            {submitting ? <Loader2 className="animate-spin" /> : null}
            Ingresar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function TwoFactorStep({ challenge, onBack }: { challenge: string; onBack: () => void }) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(value: string) {
    if (value.length !== 6 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await verifyTwoFactor(challenge, value)
    } catch (err) {
      setError(fieldErrors(err).code ?? errorMessage(err))
      setCode("")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="shadow-lg shadow-primary/5">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <CardTitle className="text-xl">Verificación en dos pasos</CardTitle>
        <CardDescription>
          Ingresa el código de 6 dígitos de tu aplicación de autenticación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit(code)
          }}
        >
          <InputOTP
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            value={code}
            onChange={setCode}
            onComplete={(value: string) => void submit(value)}
            autoFocus
            disabled={submitting}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot key={i} index={i} className="size-11 text-base" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
            {submitting ? <Loader2 className="animate-spin" /> : null}
            Verificar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft /> Volver
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

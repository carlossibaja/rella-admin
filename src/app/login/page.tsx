import type { Metadata } from "next"

import { BrandMark } from "@/components/brand"
import { ThemeToggle } from "@/components/theme-toggle"

import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Iniciar sesión" }

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 to-transparent"
      />
      <div className="relative flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-3 self-center">
          <BrandMark className="size-10" />
          <p className="text-lg font-semibold">Rella Admin</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

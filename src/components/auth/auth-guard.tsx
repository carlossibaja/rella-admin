"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { meKey, type Staff } from "@/lib/api/auth"
import { TOKEN_PENDING } from "@/lib/api/token"

import { StaffContext } from "./staff-context"
import { useToken } from "./use-token"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const token = useToken()
  const hasToken = token !== TOKEN_PENDING && token !== null
  const { data: staff, error, mutate } = useSWR<Staff>(hasToken ? meKey : null)

  useEffect(() => {
    if (token === null) router.replace("/login")
  }, [token, router])

  if (!hasToken || !staff) {
    return <FullPageLoader failed={Boolean(error)} onRetry={() => void mutate()} />
  }

  return <StaffContext.Provider value={staff}>{children}</StaffContext.Provider>
}

function FullPageLoader({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-64 flex-col gap-3 border-r p-4 md:flex">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-6 h-7 w-full" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        {failed ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            No se pudo verificar la sesión.
            <Button variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

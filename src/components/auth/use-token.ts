"use client"

import { useSyncExternalStore } from "react"

import { getToken, subscribeToken, TOKEN_PENDING } from "@/lib/api/token"

/** The stored staff token; `TOKEN_PENDING` until the client has hydrated. */
export function useToken() {
  return useSyncExternalStore<string | null | typeof TOKEN_PENDING>(
    subscribeToken,
    getToken,
    () => TOKEN_PENDING
  )
}

import axios, { AxiosError } from "axios"

import { clearToken, getToken } from "./token"

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"
).replace(/\/$/, "")

export const ME_PATH = "/staff/auth/me"

export const api = axios.create({
  baseURL: API_URL,
  headers: { Accept: "application/json" },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.set("Authorization", `Bearer ${token}`)
  return config
})

function redirectToLogin() {
  clearToken()
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.replace("/login")
  }
}

let sessionCheck: Promise<void> | null = null

/**
 * The staff API answers 404 for missing/expired tokens (the module is not
 * discoverable). A 404 elsewhere may just be an unknown record, so we confirm
 * the session against /auth/me before logging out.
 */
function confirmSession() {
  sessionCheck ??= api
    .get(ME_PATH)
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      sessionCheck = null
    })
  return sessionCheck
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const url = error.config?.url ?? ""
    const isAuthEntry =
      url.includes("/staff/auth/login") || url.includes("/staff/auth/two-factor")

    if (!isAuthEntry && getToken()) {
      if (status === 401) redirectToLogin()
      else if (status === 404 && url.includes(ME_PATH)) redirectToLogin()
      else if (status === 404) void confirmSession()
    }
    return Promise.reject(error)
  }
)

type ValidationBody = { message?: string; errors?: Record<string, string[]> }

/** Human readable (Spanish) message for an API error. */
export function errorMessage(error: unknown, fallback = "Ocurrió un error inesperado.") {
  if (axios.isAxiosError<ValidationBody>(error)) {
    const body = error.response?.data
    const firstFieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined
    if (firstFieldError) return firstFieldError
    if (body?.message) return body.message
    if (!error.response) return "No se pudo conectar con el servidor."
  }
  return fallback
}

/** Field errors from a 422 response, keyed by field name. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError<ValidationBody>(error) && error.response?.status === 422) {
    const errors = error.response.data?.errors ?? {}
    return Object.fromEntries(
      Object.entries(errors).map(([field, messages]) => [field, messages[0] ?? ""])
    )
  }
  return {}
}

/** SWR fetcher: unwraps Laravel's `{data: ...}` envelope. */
export async function fetchData<T>(url: string): Promise<T> {
  const response = await api.get<{ data: T }>(url)
  return response.data.data
}

/** SWR fetcher returning the whole body (paginated responses). */
export async function fetchBody<T>(url: string): Promise<T> {
  const response = await api.get<T>(url)
  return response.data
}

/** Builds `path?query` skipping empty values. */
export function withQuery(path: string, params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value))
  })
  const qs = query.toString()
  return qs ? `${path}?${qs}` : path
}

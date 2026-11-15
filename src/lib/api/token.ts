const TOKEN_KEY = "rella_admin_token"
const EXPIRES_KEY = "rella_admin_token_expires_at"

/** Snapshot returned during server rendering / before hydration. */
export const TOKEN_PENDING = Symbol("token-pending")

type Listener = () => void
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener())
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  const token = safeGet(TOKEN_KEY)
  if (!token) return null
  const expiresAt = safeGet(EXPIRES_KEY)
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return null
  return token
}

export function setToken(token: string, expiresAt?: string | null) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
    if (expiresAt) window.localStorage.setItem(EXPIRES_KEY, expiresAt)
    else window.localStorage.removeItem(EXPIRES_KEY)
  } catch {
    // Storage unavailable: the session will not survive a reload.
  }
  emit()
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(EXPIRES_KEY)
  } catch {
    // Ignore storage errors.
  }
  emit()
}

export function subscribeToken(listener: Listener) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY || event.key === EXPIRES_KEY) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

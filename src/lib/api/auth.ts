import { api, ME_PATH } from "./client"
import { clearToken, setToken } from "./token"

export type Staff = {
  id: number
  name: string
  email: string
  two_factor_enabled: boolean
  last_login_at: string | null
}

export type TokenResponse = {
  token: string
  expires_at: string | null
  staff: Staff
}

export type TwoFactorChallenge = {
  two_factor: true
  challenge: string
  challenge_expires_at: string
}

export type LoginResponse = TokenResponse | TwoFactorChallenge

export type TwoFactorSetup = {
  secret: string
  otpauth_url: string
}

export function isChallenge(response: LoginResponse): response is TwoFactorChallenge {
  return "two_factor" in response && response.two_factor === true
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<{ data: LoginResponse }>("/staff/auth/login", {
    email,
    password,
  })
  if (!isChallenge(data.data)) storeSession(data.data)
  return data.data
}

export async function verifyTwoFactor(challenge: string, code: string): Promise<TokenResponse> {
  const { data } = await api.post<{ data: TokenResponse }>("/staff/auth/two-factor", {
    challenge,
    code,
  })
  storeSession(data.data)
  return data.data
}

function storeSession(response: TokenResponse) {
  setToken(response.token, response.expires_at)
}

export async function logout() {
  try {
    await api.post("/staff/auth/logout")
  } finally {
    clearToken()
  }
}

export const meKey = ME_PATH

export async function enableTwoFactor(): Promise<TwoFactorSetup> {
  const { data } = await api.post<{ data: TwoFactorSetup }>("/staff/auth/two-factor/enable")
  return data.data
}

export async function confirmTwoFactor(code: string): Promise<Staff> {
  const { data } = await api.post<{ data: Staff }>("/staff/auth/two-factor/confirm", { code })
  return data.data
}

export async function disableTwoFactor(code: string): Promise<Staff> {
  const { data } = await api.post<{ data: Staff }>("/staff/auth/two-factor/disable", { code })
  return data.data
}

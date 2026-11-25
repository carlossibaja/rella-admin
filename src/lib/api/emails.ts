import { api, withQuery } from "./client"

export const TEMPLATE_NAME_MAX = 100
export const EMAIL_SUBJECT_MAX = 200
export const EMAIL_BODY_MAX = 10000

/** Placeholders the API replaces in a template's subject and body. */
export const TEMPLATE_VARIABLES = [
  { token: "{nombre}", description: "Nombre del propietario" },
  { token: "{empresa}", description: "Nombre de la empresa" },
  { token: "{plan}", description: "Plan actual" },
  { token: "{vence}", description: "Fecha de vencimiento" },
] as const

type StaffRef = { id: number; name: string }

export type EmailTemplate = {
  id: number
  name: string
  subject: string
  body: string
  created_by: StaffRef | null
  updated_by: StaffRef | null
  created_at: string
  updated_at: string
}

export type EmailTemplatePayload = { name: string; subject: string; body: string }

export type EmailStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "delayed"
  | "bounced"
  | "complained"
  | "failed"

export type SentEmail = {
  id: number
  to_email: string
  subject: string
  body: string
  /** Known values in `EmailStatus`; unknown ones are shown as plain text. */
  status: EmailStatus | string
  /** null when the template was deleted after sending. */
  template: { id: number; name: string } | null
  sent_by: StaffRef | null
  error: string | null
  sent_at: string | null
  status_updated_at: string | null
  created_at: string
}

/** Preview and send input: explicit subject/body override the template's. */
export type EmailInput = {
  template_id?: number
  subject?: string
  body?: string
}

export type EmailPreview = {
  to: { name: string; email: string } | null
  subject: string
  body: string
  html: string
  can_send: boolean
  cannot_send_reason: string | null
}

/* Templates */

export const EMAIL_TEMPLATES_KEY = "/staff/email-templates"

export async function createEmailTemplate(payload: EmailTemplatePayload): Promise<EmailTemplate> {
  const { data } = await api.post<{ data: EmailTemplate }>(EMAIL_TEMPLATES_KEY, payload)
  return data.data
}

export async function updateEmailTemplate(
  id: number,
  payload: EmailTemplatePayload
): Promise<EmailTemplate> {
  const { data } = await api.put<{ data: EmailTemplate }>(`${EMAIL_TEMPLATES_KEY}/${id}`, payload)
  return data.data
}

/** Sent emails keep their own copy; their `template` becomes null. */
export async function deleteEmailTemplate(id: number): Promise<void> {
  await api.delete(`${EMAIL_TEMPLATES_KEY}/${id}`)
}

/* Organization emails */

function organizationEmailsPath(organizationId: number | string) {
  return `/staff/organizations/${organizationId}/emails`
}

/** Paginated (20 per page) history, newest first; use with `fetchBody`. */
export function organizationEmailsKey(organizationId: number | string, page = 1) {
  return withQuery(organizationEmailsPath(organizationId), { page })
}

/** SWR key matcher for every page of an organization's email history. */
export function isOrganizationEmailsKey(organizationId: number | string) {
  const path = organizationEmailsPath(organizationId)
  return (key: unknown) =>
    typeof key === "string" && (key === path || key.startsWith(`${path}?`))
}

export async function previewOrganizationEmail(
  organizationId: number | string,
  input: EmailInput
): Promise<EmailPreview> {
  const { data } = await api.post<{ data: EmailPreview }>(
    `${organizationEmailsPath(organizationId)}/preview`,
    input
  )
  return data.data
}

/** Queues the email (202, status "queued"); the API throttles it to 30 per minute. */
export async function sendOrganizationEmail(
  organizationId: number | string,
  input: EmailInput
): Promise<SentEmail> {
  const { data } = await api.post<{ data: SentEmail }>(organizationEmailsPath(organizationId), input)
  return data.data
}

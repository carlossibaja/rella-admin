"use client"

import { useState } from "react"
import Link from "next/link"
import axios from "axios"
import { Loader2, Mail, Pencil, TriangleAlert, X } from "lucide-react"
import { toast } from "sonner"
import useSWR, { useSWRConfig } from "swr"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useDebounced } from "@/hooks/use-debounced"
import { errorMessage, fieldErrors } from "@/lib/api/client"
import {
  EMAIL_BODY_MAX,
  EMAIL_SUBJECT_MAX,
  EMAIL_TEMPLATES_KEY,
  isOrganizationEmailsKey,
  previewOrganizationEmail,
  sendOrganizationEmail,
  type EmailInput,
  type EmailPreview,
  type EmailTemplate,
} from "@/lib/api/emails"

type Recipient = { id: number; name: string }

/** Sends a templated email to the organization's owner; `organization` null keeps it closed. */
export function SendEmailDialog({
  organization,
  onOpenChange,
}: {
  organization: Recipient | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={organization !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {organization ? (
          <SendEmailForm organization={organization} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function SendEmailForm({ organization, onDone }: { organization: Recipient; onDone: () => void }) {
  const { mutate } = useSWRConfig()
  const templates = useSWR<EmailTemplate[]>(EMAIL_TEMPLATES_KEY)
  const [templateId, setTemplateId] = useState("")
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)

  const input: EmailInput | null = templateId
    ? { template_id: Number(templateId), ...(editing ? { subject, body } : {}) }
    : null
  const inputJson = input ? JSON.stringify(input) : ""
  // Overrides are typed, so preview requests wait for a pause.
  const previewJson = useDebounced(inputJson)
  const stale = previewJson !== inputJson

  const preview = useSWR<EmailPreview>(
    previewJson ? ["email-preview", organization.id, previewJson] : null,
    ([, id, json]: [string, number, string]) => previewOrganizationEmail(id, JSON.parse(json))
  )
  const previewErrors = fieldErrors(preview.error)
  const errors = { ...previewErrors, ...sendErrors }

  function selectTemplate(value: string) {
    setTemplateId(value)
    setEditing(false)
    setSendErrors({})
  }

  function startEditing() {
    const template = templates.data?.find((item) => String(item.id) === templateId)
    setSubject(template?.subject ?? preview.data?.subject ?? "")
    setBody(template?.body ?? preview.data?.body ?? "")
    setEditing(true)
  }

  const canSend =
    Boolean(previewJson) &&
    !stale &&
    !preview.isValidating &&
    preview.data?.can_send === true &&
    (!editing || (subject.trim() !== "" && body.trim() !== ""))

  async function send() {
    if (!canSend || !previewJson) return
    setSending(true)
    setSendErrors({})
    try {
      await sendOrganizationEmail(organization.id, JSON.parse(previewJson) as EmailInput)
      void mutate(isOrganizationEmailsKey(organization.id))
      toast.success("Correo en cola", {
        description: preview.data?.to
          ? `Para ${preview.data.to.name} · ${preview.data.to.email}`
          : organization.name,
      })
      onDone()
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      if (status === 429) {
        toast.error("Demasiados envíos, intenta en un minuto")
      } else if (status === 409) {
        toast.error(errorMessage(error, "La empresa está eliminada; no se puede enviar."))
      } else {
        const fields = fieldErrors(error)
        setSendErrors(fields)
        if (!Object.keys(fields).length) toast.error(errorMessage(error))
      }
    } finally {
      setSending(false)
    }
  }

  const templateList = templates.data ?? []

  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Enviar email</DialogTitle>
        <DialogDescription>Al propietario de {organization.name}</DialogDescription>
      </DialogHeader>

      {templates.isLoading && !templates.data ? (
        <Skeleton className="h-9 w-full" />
      ) : templates.error && !templates.data ? (
        <p className="text-sm text-destructive">{errorMessage(templates.error)}</p>
      ) : templateList.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed px-4 py-6 text-center">
          <Mail className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aún no hay plantillas de correo.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/email-templates">Ir a Plantillas de correo</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="email-template">Plantilla</Label>
          <Select value={templateId} onValueChange={selectTemplate}>
            <SelectTrigger id="email-template" className="w-full">
              <SelectValue placeholder="Elige una plantilla" />
            </SelectTrigger>
            <SelectContent>
              {templateList.map((template) => (
                <SelectItem key={template.id} value={String(template.id)}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.template_id ? (
            <p className="text-sm text-destructive">{errors.template_id}</p>
          ) : null}
        </div>
      )}

      {templateId ? (
        <>
          {editing ? (
            <div className="grid gap-4 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Editar este envío</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X /> Usar la plantilla
                </Button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email-subject">Asunto</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  maxLength={EMAIL_SUBJECT_MAX}
                  onChange={(e) => setSubject(e.target.value)}
                  aria-invalid={Boolean(errors.subject)}
                />
                {errors.subject ? <p className="text-sm text-destructive">{errors.subject}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email-body">Cuerpo</Label>
                <Textarea
                  id="email-body"
                  value={body}
                  maxLength={EMAIL_BODY_MAX}
                  onChange={(e) => setBody(e.target.value)}
                  aria-invalid={Boolean(errors.body)}
                  rows={8}
                  className="max-h-[40vh]"
                />
                {errors.body ? <p className="text-sm text-destructive">{errors.body}</p> : null}
              </div>
            </div>
          ) : null}

          <PreviewPanel
            preview={preview.data}
            loading={(preview.isLoading || stale) && !preview.data}
            error={
              preview.error && !Object.keys(previewErrors).length
                ? errorMessage(preview.error)
                : null
            }
            toError={errors.to}
            onEdit={editing ? undefined : startEditing}
          />
        </>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="button" disabled={!canSend || sending} onClick={() => void send()}>
          {sending ? <Loader2 className="animate-spin" /> : <Mail />}
          Enviar
        </Button>
      </DialogFooter>
    </div>
  )
}

function PreviewPanel({
  preview,
  loading,
  error,
  toError,
  onEdit,
}: {
  preview: EmailPreview | undefined
  loading: boolean
  error: string | null
  toError?: string
  onEdit?: () => void
}) {
  if (loading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!preview) return null

  const blocked = toError ?? (preview.can_send ? null : preview.cannot_send_reason ?? "No se puede enviar.")

  return (
    <div className="grid gap-3">
      {blocked ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-300"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {blocked}
        </div>
      ) : null}

      <dl className="grid gap-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted-foreground">Para</dt>
          <dd className="min-w-0 truncate">
            {preview.to ? `${preview.to.name} · ${preview.to.email}` : "—"}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-muted-foreground">Asunto</dt>
          <dd className="min-w-0 font-medium break-words">{preview.subject}</dd>
        </div>
      </dl>

      <details className="rounded-md bg-muted/60 px-3 py-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Texto plano</summary>
        <p className="mt-2 whitespace-pre-wrap break-words">{preview.body}</p>
      </details>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Vista previa</p>
        {onEdit ? (
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            <Pencil /> Editar
          </Button>
        ) : null}
      </div>
      <iframe
        sandbox=""
        srcDoc={preview.html}
        title="Vista previa del correo"
        className="h-80 w-full rounded-md border bg-white"
      />
    </div>
  )
}

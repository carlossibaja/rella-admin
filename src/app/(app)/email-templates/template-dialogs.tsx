"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useSWRConfig } from "swr"

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
import { Textarea } from "@/components/ui/textarea"
import { errorMessage, fieldErrors } from "@/lib/api/client"
import {
  EMAIL_BODY_MAX,
  EMAIL_SUBJECT_MAX,
  EMAIL_TEMPLATES_KEY,
  TEMPLATE_NAME_MAX,
  TEMPLATE_VARIABLES,
  createEmailTemplate,
  deleteEmailTemplate,
  updateEmailTemplate,
  type EmailTemplate,
} from "@/lib/api/emails"
import { formatNumber } from "@/lib/format"

/** Create (template null) or edit dialog; the form remounts on every open so it starts fresh. */
export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: EmailTemplate | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <TemplateForm template={template} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function TemplateForm({ template, onDone }: { template: EmailTemplate | null; onDone: () => void }) {
  const { mutate } = useSWRConfig()
  const [name, setName] = useState(template?.name ?? "")
  const [subject, setSubject] = useState(template?.subject ?? "")
  const [body, setBody] = useState(template?.body ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const valid = name.trim() !== "" && subject.trim() !== "" && body.trim() !== ""

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) return
    setSaving(true)
    setErrors({})
    const payload = { name: name.trim(), subject: subject.trim(), body }
    try {
      const saved = template
        ? await updateEmailTemplate(template.id, payload)
        : await createEmailTemplate(payload)
      void mutate(EMAIL_TEMPLATES_KEY)
      toast.success(template ? "Plantilla actualizada" : "Plantilla creada", {
        description: saved.name,
      })
      onDone()
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(fields)
      if (!Object.keys(fields).length) toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{template ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
        <DialogDescription>
          El cuerpo es texto plano; las variables se reemplazan al enviar.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="template-name">Nombre</Label>
        <Input
          id="template-name"
          placeholder="Ej.: Recordatorio de vencimiento"
          value={name}
          maxLength={TEMPLATE_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="template-subject">Asunto</Label>
        <Input
          id="template-subject"
          placeholder="Ej.: {empresa}, tu plan vence el {vence}"
          value={subject}
          maxLength={EMAIL_SUBJECT_MAX}
          onChange={(e) => setSubject(e.target.value)}
          aria-invalid={Boolean(errors.subject)}
        />
        {errors.subject ? <p className="text-sm text-destructive">{errors.subject}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="template-body">Cuerpo</Label>
        <Textarea
          id="template-body"
          placeholder={"Hola {nombre},\n\n…"}
          value={body}
          maxLength={EMAIL_BODY_MAX}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={Boolean(errors.body)}
          rows={10}
          className="max-h-[50vh]"
        />
        {errors.body ? (
          <p className="text-sm text-destructive">{errors.body}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {formatNumber(body.length)} / {formatNumber(EMAIL_BODY_MAX)} caracteres
          </p>
        )}
      </div>

      <VariablesHint />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valid || saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          {template ? "Guardar cambios" : "Crear plantilla"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function VariablesHint() {
  return (
    <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
      <p className="mb-1 font-medium text-foreground">Variables disponibles</p>
      <ul className="grid gap-1 sm:grid-cols-2">
        {TEMPLATE_VARIABLES.map((variable) => (
          <li key={variable.token}>
            <code className="rounded bg-background px-1 py-0.5 font-mono text-foreground">
              {variable.token}
            </code>{" "}
            {variable.description}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DeleteTemplateDialog({
  template,
  onOpenChange,
}: {
  template: EmailTemplate | null
  onOpenChange: (open: boolean) => void
}) {
  const { mutate } = useSWRConfig()
  const [deleting, setDeleting] = useState(false)

  async function confirm() {
    if (!template) return
    setDeleting(true)
    try {
      await deleteEmailTemplate(template.id)
      void mutate(EMAIL_TEMPLATES_KEY)
      toast.success("Plantilla eliminada", { description: template.name })
      onOpenChange(false)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={template !== null} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar plantilla</DialogTitle>
          <DialogDescription>
            Se eliminará «{template?.name}». Los correos ya enviados conservan su copia.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={deleting} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={deleting} onClick={() => void confirm()}>
            {deleting ? <Loader2 className="animate-spin" /> : null}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

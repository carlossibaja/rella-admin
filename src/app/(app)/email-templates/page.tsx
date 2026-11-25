"use client"

import { useState } from "react"
import { Mail, Pencil, Plus, Trash2 } from "lucide-react"
import useSWR from "swr"

import { EmptyState, ErrorState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { errorMessage } from "@/lib/api/client"
import { EMAIL_TEMPLATES_KEY, type EmailTemplate } from "@/lib/api/emails"
import { formatDateTime, formatNumber } from "@/lib/format"

import { DeleteTemplateDialog, TemplateFormDialog, VariablesHint } from "./template-dialogs"

export default function EmailTemplatesPage() {
  const { data, error, isLoading, mutate } = useSWR<EmailTemplate[]>(EMAIL_TEMPLATES_KEY)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [deleting, setDeleting] = useState<EmailTemplate | null>(null)

  const templates = data ?? []

  function openForm(template: EmailTemplate | null) {
    setEditing(template)
    setFormOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Plantillas de correo"
        description={
          data
            ? `${formatNumber(templates.length)} ${templates.length === 1 ? "plantilla" : "plantillas"}`
            : "Correos para enviar a los propietarios de las empresas"
        }
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus /> Nueva plantilla
          </Button>
        }
      />

      <VariablesHint />

      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void mutate()} />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Nombre</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Última actualización</TableHead>
                <TableHead className="pr-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && !data
                ? Array.from({ length: 4 }, (_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }, (_, j) => (
                        <TableCell key={j} className={j === 0 ? "pl-4" : undefined}>
                          <Skeleton className="h-5 w-full max-w-40" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="pl-4 font-medium">{template.name}</TableCell>
                      <TableCell>
                        <p className="max-w-md truncate">{template.subject}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p>{formatDateTime(template.updated_at)}</p>
                        <p className="text-xs text-muted-foreground">
                          {(template.updated_by ?? template.created_by)?.name ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="pr-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openForm(template)}
                          aria-label={`Editar ${template.name}`}
                        >
                          <Pencil /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(template)}
                          aria-label={`Eliminar ${template.name}`}
                        >
                          <Trash2 /> Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          {!isLoading && data && templates.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Aún no hay plantillas"
              description="Crea una plantilla para enviar correos a los propietarios."
              action={
                <Button variant="outline" onClick={() => openForm(null)}>
                  <Plus /> Nueva plantilla
                </Button>
              }
            />
          ) : null}
        </Card>
      )}

      <TemplateFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editing}
      />
      <DeleteTemplateDialog template={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
    </>
  )
}

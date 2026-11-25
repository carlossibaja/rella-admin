"use client"

import { useState } from "react"
import { Mail } from "lucide-react"
import useSWR from "swr"

import { EmptyState, ErrorState } from "@/components/empty-state"
import { SimplePagination } from "@/components/simple-pagination"
import { EmailStatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { errorMessage, fetchBody } from "@/lib/api/client"
import { organizationEmailsKey, type SentEmail } from "@/lib/api/emails"
import type { Paginated } from "@/lib/api/organizations"
import { formatDateTime } from "@/lib/format"

export function SentEmailsCard({ organizationId }: { organizationId: number }) {
  const [page, setPage] = useState(1)
  const { data, error, isLoading, isValidating, mutate } = useSWR<Paginated<SentEmail>>(
    organizationEmailsKey(organizationId, page),
    fetchBody
  )
  const rows = data?.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correos enviados</CardTitle>
        <CardDescription>Enviados por el staff al propietario, del más reciente al más antiguo</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {error && !data ? (
          <div className="px-6">
            <ErrorState message={errorMessage(error)} onRetry={() => void mutate()} />
          </div>
        ) : !isLoading && data && rows.length === 0 ? (
          <EmptyState className="py-6" icon={Mail} title="Aún no se han enviado correos" />
        ) : (
          <div className={isValidating && data ? "opacity-70 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead className="pr-6">Enviado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !data
                  ? Array.from({ length: 4 }, (_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }, (_, j) => (
                          <TableCell key={j} className={j === 0 ? "pl-6" : undefined}>
                            <Skeleton className="h-5 w-full max-w-32" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell className="pl-6 align-top whitespace-nowrap">
                          {formatDateTime(email.sent_at ?? email.created_at)}
                        </TableCell>
                        <TableCell className="align-top">
                          <EmailStatusBadge status={email.status} />
                        </TableCell>
                        <TableCell className="align-top whitespace-normal">
                          <p className="max-w-md break-words">{email.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {email.to_email}
                            {email.template ? ` · ${email.template.name}` : ""}
                          </p>
                          {email.error ? (
                            <p className="mt-1 max-w-md text-xs break-words text-red-700 dark:text-red-400">
                              {email.error}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="pr-6 align-top">{email.sent_by?.name ?? "—"}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        )}
        {data && data.meta.last_page > 1 ? (
          <div className="border-t px-6 pt-3">
            <SimplePagination
              page={data.meta.current_page}
              lastPage={data.meta.last_page}
              from={data.meta.from}
              to={data.meta.to}
              total={data.meta.total}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

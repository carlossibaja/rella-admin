# Staff one-to-one emails to organization owners

## Objective
Let staff send a templated email to an organization's owner from the panel, manage the templates, and see the email history per organization.

## Why
Requested by the user through the rellashop-api session. API is on rellashop-api branch `feat/staff-emails` (commits b51bdee, c2c7603), not merged, pushed, or migrated in prod yet.

## Scope / constraints
- All endpoints under `/api/staff` with the staff bearer token (existing axios client).
- UI copy in Spanish (panel language). Follow the existing design; do not restyle existing screens.
- Template body is a plain textarea (not HTML). Preview `html` renders in a sandboxed iframe (`sandbox=""`).
- Status labels: queued "En cola", sent "Enviado", delivered "Entregado", delayed "Retrasado", bounced "Rebotó", complained "Marcado como spam", failed "Falló"; unknown values shown as plain text.
- No test runner in repo: checks are `eslint` + `tsc --noEmit` + `next build`.
- Delivery strategy: ask-on-risk. Forecast ~700 authored lines over 3 work units.

## Tasks
- [x] T1 — API module `src/lib/api/emails.ts` (types, SWR keys, mutations) + "Plantillas de correo" page (list, create, edit, delete, variables hint) + sidebar entry. Route: delegated (2+ non-trivial files, writer trigger).
- [x] T2 — "Enviar email" button per row in the Empresas table and a send dialog: template select, server preview (recipient, subject, body, html iframe), optional subject/body edit, `can_send`/`cannot_send_reason`, 202 success toast, 409/422/429 errors. Route: delegated.
- [x] T3 — "Correos enviados" paginated history in the organization detail (status badge, subject, sent by, date). Route: delegated.

## Acceptance
- Endpoints and payloads match the contract in this doc's source message.
- lint, typecheck, build pass.

## Progress
- Branch `feat/staff-emails` created from main.
- T1 done: `src/lib/api/emails.ts`, `/email-templates` page (list, create/edit dialog, in-app delete confirm, variables hint), sidebar entry. Checks: eslint pass, tsc pass. Commit ca189a9.
- T2 done: "Enviar email" per row (disabled for deleted orgs, stopPropagation) + `send-email-dialog.tsx` (debounced server preview keyed by input, sandboxed iframe, overrides, can_send gate, 409/422/429 handling, revalidates org emails). Checks: eslint pass, tsc pass. Commit 63954d8.
- T3 done: `sent-emails-card.tsx` "Correos enviados" (EmailStatusBadge in status-badge.tsx, sent by, date, error text, SimplePagination from `meta`, empty state, skeleton). Checks: npm run lint pass, tsc pass, next build pass. Commit 76e0912.

- Browser check against the local API (2026-11-25):
  - Template create works.
  - The no-owner org shows the reason and disables Enviar.
  - Preview fills the variables; Editar re-previews.
  - Send returned the "Correo en cola" toast, and the history shows the row as "En cola" with sent-by and template.
  - Status stayed queued locally (queue worker likely not running).

## Next step
Waiting for the rellashop-api Markdown change, then update the template body hint. Push and PR are the user's decision.

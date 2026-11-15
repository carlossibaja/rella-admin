"use client"

import { PageHeader } from "@/components/page-header"

import { SubscriptionPayments } from "./subscription-payments"

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        title="Transacciones"
        description="Pagos de Wompi de todas las empresas: suscripciones y compras de créditos RellaCash"
      />
      <SubscriptionPayments />
    </>
  )
}

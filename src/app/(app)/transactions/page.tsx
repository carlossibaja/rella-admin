"use client"

import { useState } from "react"

import { PageHeader } from "@/components/page-header"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { withQuery } from "@/lib/api/client"

import { RellaCashTab } from "./rellacash-tab"
import { pick, readQuery } from "./shared"
import { SubscriptionPaymentsTab } from "./subscription-payments-tab"

const TABS = ["rellacash", "payments"] as const
type Tab = (typeof TABS)[number]

/** Filters that mean the same in both tabs and survive a tab switch. */
const SHARED_PARAMS = ["search", "organization_id", "from", "to"] as const

export default function TransactionsPage() {
  const [tab, setTab] = useState<Tab>(() => pick(readQuery(), "tab", TABS, "rellacash"))

  function changeTab(next: Tab) {
    // Reset tab-specific filters before the other tab mounts and reads the URL.
    const query = readQuery()
    const shared = Object.fromEntries(SHARED_PARAMS.map((key) => [key, query.get(key)]))
    window.history.replaceState(null, "", withQuery(window.location.pathname, { tab: next, ...shared }))
    setTab(next)
  }

  return (
    <>
      <PageHeader title="Transacciones" description="Movimientos de RellaCash y pagos de suscripción de todas las empresas" />

      <Tabs value={tab} onValueChange={(value) => changeTab(value as Tab)}>
        <TabsList>
          <TabsTrigger value="rellacash">RellaCash</TabsTrigger>
          <TabsTrigger value="payments">Pagos de suscripción</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "rellacash" ? <RellaCashTab /> : <SubscriptionPaymentsTab />}
    </>
  )
}

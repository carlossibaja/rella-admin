"use client"

import { ThemeProvider } from "next-themes"
import { SWRConfig } from "swr"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { fetchData } from "@/lib/api/client"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SWRConfig
        value={{
          fetcher: fetchData,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
          keepPreviousData: true,
        }}
      >
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
      </SWRConfig>
    </ThemeProvider>
  )
}

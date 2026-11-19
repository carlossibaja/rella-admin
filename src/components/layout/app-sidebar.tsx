"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeftRight, Bot, Building2, ChartColumn, LayoutDashboard, ShieldCheck, TrendingUp, UserPlus } from "lucide-react"

import { BrandMark } from "@/components/brand"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizations", label: "Empresas", icon: Building2 },
  { href: "/signups", label: "Altas", icon: UserPlus },
  { href: "/organization-metrics", label: "Métricas de empresas", icon: ChartColumn },
  { href: "/revenue", label: "Ingresos", icon: TrendingUp },
  { href: "/ai-profit", label: "Ganancia IA", icon: Bot },
  { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
] as const

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" onClick={() => setOpenMobile(false)}>
                <BrandMark />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Rella Admin</span>
                  <span className="truncate text-xs text-muted-foreground">RellaChat</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(pathname, item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive(pathname, "/account")} tooltip="Seguridad">
              <Link href="/account" onClick={() => setOpenMobile(false)}>
                <ShieldCheck />
                <span>Seguridad</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { LogOut, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { useStaff } from "@/components/auth/staff-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { logout } from "@/lib/api/auth"
import { initials } from "@/lib/format"

export function AppHeader() {
  const staff = useStaff()
  const [leaving, setLeaving] = useState(false)

  async function onLogout() {
    setLeaving(true)
    try {
      await logout()
    } catch {
      toast.message("Sesión cerrada en este dispositivo.")
    }
    window.location.replace("/login")
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <div className="flex-1" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {initials(staff.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{staff.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">{staff.name}</p>
            <p className="truncate text-xs text-muted-foreground">{staff.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account">
              <ShieldCheck /> Seguridad
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled={leaving} onClick={onLogout}>
            <LogOut /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

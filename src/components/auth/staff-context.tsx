"use client"

import { createContext, useContext } from "react"

import type { Staff } from "@/lib/api/auth"

export const StaffContext = createContext<Staff | null>(null)

export function useStaff() {
  const staff = useContext(StaffContext)
  if (!staff) throw new Error("useStaff must be used inside the authenticated layout.")
  return staff
}

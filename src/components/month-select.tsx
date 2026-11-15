"use client"

import { CalendarDays } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatMonth, recentMonths } from "@/lib/format"

export function MonthSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (month: string) => void
}) {
  const months = recentMonths(24)
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48" aria-label="Mes">
        <CalendarDays className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((month) => (
          <SelectItem key={month} value={month}>
            <span>{formatMonth(month, "long")}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

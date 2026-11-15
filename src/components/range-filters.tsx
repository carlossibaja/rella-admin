"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { GroupBy } from "@/lib/api/metrics"

const GROUP_LABELS: Record<GroupBy, string> = { day: "Por día", week: "Por semana", month: "Por mes" }

export function DateField({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={id} type="date" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function GroupBySelect({
  value,
  onChange,
}: {
  value: GroupBy
  onChange: (value: GroupBy) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">Agrupar</Label>
      <Select value={value} onValueChange={(next) => onChange(next as GroupBy)}>
        <SelectTrigger className="w-full" aria-label="Agrupar">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(GROUP_LABELS) as GroupBy[]).map((group) => (
            <SelectItem key={group} value={group}>
              {GROUP_LABELS[group]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

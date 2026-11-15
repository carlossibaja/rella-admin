import type { ChartConfig } from "@/components/ui/chart"
import { formatCOP, formatNumber } from "@/lib/format"

/** Builds a recharts tooltip formatter: swatch, series label and value. */
export function tooltipFormatter(config: ChartConfig, kind: "money" | "count" = "money") {
  return function TooltipRow(
    value: unknown,
    name: unknown,
    item: { color?: string; payload?: unknown }
  ) {
    const key = String(name)
    const label = config[key]?.label ?? key
    const formatted = kind === "money" ? formatCOP(Number(value)) : formatNumber(Number(value))
    return (
      <div className="flex w-full min-w-40 items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: item.color }} />
        <span className="text-muted-foreground">{label}</span>
        <span className="ml-auto font-mono font-medium text-foreground tabular-nums">
          {formatted}
        </span>
      </div>
    )
  }
}

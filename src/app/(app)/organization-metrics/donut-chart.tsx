"use client"

import { Label, Pie, PieChart } from "recharts"

import { tooltipFormatter } from "@/components/money-tooltip"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

import { LegendRow } from "./chart-card"

export type DonutSlice = { key: string; label: string; value: number; color: string }

/**
 * Donut with a headline number in the hole and a legend that lists every slice with its count and
 * share. Stacks vertically on narrow screens; sits side by side from `sm`.
 */
export function DonutChart({
  slices,
  centerValue,
  centerLabel,
}: {
  slices: DonutSlice[]
  centerValue: string
  centerLabel: string
}) {
  const config = Object.fromEntries(
    slices.map((slice) => [slice.key, { label: slice.label, color: slice.color }])
  ) satisfies ChartConfig
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const data = slices.map((slice) => ({ key: slice.key, value: slice.value, fill: slice.color }))

  return (
    <div className="flex h-full flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <ChartContainer config={config} className="aspect-square h-52 shrink-0">
        <PieChart accessibilityLayer>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey="key" formatter={tooltipFormatter(config, "count")} />}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            innerRadius="62%"
            outerRadius="92%"
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null
                const { cx = 0, cy = 0 } = viewBox
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={cx} y={cy - 4} className="fill-foreground text-2xl font-semibold tabular-nums">
                      {centerValue}
                    </tspan>
                    <tspan x={cx} y={cy + 18} className="fill-muted-foreground text-xs">
                      {centerLabel}
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="grid w-full min-w-0 gap-2.5">
        {slices.map((slice) => (
          <LegendRow key={slice.key} color={slice.color} label={slice.label} value={slice.value} total={total} />
        ))}
      </ul>
    </div>
  )
}

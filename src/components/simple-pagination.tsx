import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

export function SimplePagination({
  page,
  lastPage,
  from,
  to,
  total,
  onPageChange,
}: {
  page: number
  lastPage: number
  from: number | null
  to: number | null
  total: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <span>
        {total === 0
          ? "Sin resultados"
          : `Mostrando ${formatNumber(from)}–${formatNumber(to)} de ${formatNumber(total)}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft /> Anterior
        </Button>
        <span className="px-2 tabular-nums">
          {page} / {Math.max(lastPage, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

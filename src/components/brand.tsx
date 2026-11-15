import Image from "next/image"

import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative size-8 shrink-0 overflow-hidden rounded-lg shadow-sm",
        className
      )}
    >
      <Image src="/rella-logo.png" alt="Rella" fill sizes="40px" className="object-cover" priority />
    </div>
  )
}

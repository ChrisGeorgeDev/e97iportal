"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

export function DemoDisclaimer({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  if (!text) return null

  return (
    <div className={cn("border-t border-border bg-background", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left md:hidden"
      >
        <span className="text-2xs tracking-label text-muted-foreground uppercase">
          Disclaimer
        </span>
        <span className="text-sm text-muted-foreground" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      <p
        className={cn(
          "px-4 pb-4 text-2xs leading-relaxed text-muted-foreground md:block md:pt-3",
          open ? "block" : "hidden"
        )}
      >
        {text}
      </p>
    </div>
  )
}

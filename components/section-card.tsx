import Link from "next/link"

import type { Icon } from "@phosphor-icons/react"
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr"

import { cn } from "@/lib/utils"

export function SectionCard({
  href,
  icon: SectionIcon,
  title,
  description,
  className,
}: {
  href: string
  icon: Icon
  title: string
  description: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col justify-between gap-6 border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/20",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <SectionIcon className="size-6 text-primary" weight="fill" />
        <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-heading text-xl font-medium text-foreground">
          {title}
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </Link>
  )
}

import { cn } from "@/lib/utils"

export function DemoDisclaimer({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  if (!text) return null

  return (
    <div className={cn("border-t border-border bg-background px-4 pt-3 pb-4", className)}>
      <p className="text-[10px] leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}

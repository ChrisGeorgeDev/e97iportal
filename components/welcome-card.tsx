import { cn } from "@/lib/utils"

function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning"
  if (hour >= 12 && hour < 17) return "Good afternoon"
  if (hour >= 17 && hour < 22) return "Good evening"
  return null
}

export function WelcomeCard({
  firstName,
  className,
}: {
  firstName: string
  className?: string
}) {
  const now = new Date()
  const greeting = getGreeting(now.getHours()) ?? "Welcome"
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div
      className={cn(
        "relative flex flex-col justify-center overflow-hidden border border-primary/30 bg-linear-to-br from-secondary to-card p-6 md:p-8",
        className
      )}
    >
      <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full border border-primary/15" />
      <span className="text-2xs tracking-label text-primary uppercase">
        {today}
      </span>
      <h1 className="mt-2 font-heading text-3xl font-medium text-foreground md:text-4xl">
        {greeting}
        {firstName ? `, ${firstName}` : ""}.
      </h1>
    </div>
  )
}

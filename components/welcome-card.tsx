"use client"

import { useEffect, useState } from "react"

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
  // The server has no idea what timezone the visitor is in, so the initial
  // render (both server-side and the client's first paint, before this
  // effect runs) uses the "time cannot be established" fallback — then this
  // swaps in the real greeting once the browser's local clock is available.
  const [{ greeting, today }, setLocalGreeting] = useState<{
    greeting: string
    today: string | null
  }>({ greeting: "Welcome", today: null })

  useEffect(() => {
    // Deliberately deferred to an effect, not computed during render: the
    // browser's local timezone isn't knowable during SSR (or the client's
    // first hydration pass, which must match the server's output), so this
    // has to run post-mount rather than be derived synchronously.
    const now = new Date()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalGreeting({
      greeting: getGreeting(now.getHours()) ?? "Welcome",
      today: now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    })
  }, [])

  return (
    <div
      className={cn(
        "relative flex flex-col justify-center overflow-hidden border border-primary/30 bg-linear-to-br from-secondary to-card p-6 md:p-8",
        className
      )}
    >
      <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full border border-primary/15" />
      <span
        className={cn(
          "text-2xs tracking-label text-primary uppercase",
          today
            ? "animate-in fade-in-0 slide-in-from-bottom-1 duration-500"
            : "opacity-0"
        )}
      >
        {today}
      </span>
      <h1
        className={cn(
          "mt-2 font-heading text-3xl font-medium text-foreground md:text-4xl",
          today
            ? "animate-in fade-in-0 slide-in-from-bottom-1 duration-500"
            : "opacity-0"
        )}
      >
        {greeting}
        {firstName ? `, ${firstName}` : ""}.
      </h1>
    </div>
  )
}

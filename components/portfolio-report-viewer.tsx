"use client"

import { useState } from "react"

import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr"

export function PortfolioReportViewer({
  reportUrl,
  title,
}: {
  reportUrl: string
  title: string
}) {
  const [loading, setLoading] = useState(true)

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <CircleNotchIcon className="size-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading report</span>
        </div>
      )}
      <iframe
        src={reportUrl}
        title={title}
        sandbox="allow-scripts"
        onLoad={() => setLoading(false)}
        className="h-full w-full border-0"
      />
    </div>
  )
}

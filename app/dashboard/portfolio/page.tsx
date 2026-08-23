import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { getPortfolioReports } from "@/lib/portfolio"

export default async function PortfolioPage() {
  const reports = await getPortfolioReports()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4">
      <div className="flex flex-col divide-y divide-border border-b border-border">
        {reports.map((report) => (
          <Link
            key={report.slug}
            href={`/dashboard/portfolio/${report.slug}`}
            className="group flex items-center justify-between gap-3 px-3 py-4 transition-colors hover:bg-accent/40"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground group-hover:text-primary">
                {report.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(report.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {report.period}
              </span>
            </div>
            <Badge variant={report.type === "Annual Report" ? "gold" : "secondary"}>
              {report.type}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  )
}

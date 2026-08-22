import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getPortfolioReports } from "@/lib/portfolio"

export default async function PortfolioPage() {
  const reports = await getPortfolioReports()

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {reports.map((report) => (
        <Link key={report.slug} href={`/dashboard/portfolio/${report.slug}`}>
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{report.title}</CardTitle>
                <Badge variant={report.type === "Annual Report" ? "gold" : "secondary"}>
                  {report.type}
                </Badge>
              </div>
              <CardDescription>
                {new Date(report.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>{report.period}</CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

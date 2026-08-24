import { notFound } from "next/navigation"

import { SetBreadcrumbTitle } from "@/components/breadcrumb-title-provider"
import { DemoDisclaimer } from "@/components/demo-disclaimer"
import { PortfolioReportViewer } from "@/components/portfolio-report-viewer"
import { getPortfolioReportBySlug } from "@/lib/portfolio"

export default async function PortfolioReportPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const report = await getPortfolioReportBySlug(slug)

  if (!report) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col p-4">
      <SetBreadcrumbTitle title={report.title} />
      <div className="flex-1">
        <PortfolioReportViewer reportUrl={report.reportUrl} title={report.title} />
      </div>
      <DemoDisclaimer text={report.disclaimer} className="sticky bottom-0 z-10" />
    </div>
  )
}

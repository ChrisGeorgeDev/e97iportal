import { strapiFetch, strapiFetchOptional } from "@/lib/strapi/client"

export type PortfolioReport = {
  slug: string
  title: string
  type: "Monthly Report" | "Annual Report"
  period: string
  publishedAt: string
  reportUrl: string
  disclaimer: string
}

type StrapiMediaFile = {
  url: string
}

type StrapiPortfolioReport = {
  documentId: string
  title: string
  type: "Monthly Report" | "Annual Report"
  period: string | null
  publishedAt: string | null
  report: StrapiMediaFile | null
  disclaimer: string | null
}

const STRAPI_URL = process.env.STRAPI_URL

function toAbsoluteUrl(url: string): string {
  return url.startsWith("http") ? url : `${STRAPI_URL}${url}`
}

function mapReport(report: StrapiPortfolioReport): PortfolioReport {
  return {
    slug: report.documentId,
    title: report.title,
    type: report.type,
    period: report.period ?? "",
    publishedAt: report.publishedAt ?? "",
    reportUrl: report.report ? toAbsoluteUrl(report.report.url) : "",
    disclaimer: report.disclaimer ?? "",
  }
}

export async function getPortfolioReports(): Promise<PortfolioReport[]> {
  const reports = await strapiFetch<StrapiPortfolioReport[]>(
    "/portfolio-reports?populate=report&sort=publishedAt:desc"
  )
  return reports.map(mapReport)
}

export async function getPortfolioReportBySlug(
  slug: string
): Promise<PortfolioReport | undefined> {
  const report = await strapiFetchOptional<StrapiPortfolioReport>(
    `/portfolio-reports/${slug}?populate=report`
  )
  return report ? mapReport(report) : undefined
}

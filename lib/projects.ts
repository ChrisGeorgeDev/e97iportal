import type { badgeVariants } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"
import { strapiFetch } from "@/lib/strapi/client"

export type Project = {
  id: string
  name: string
  subtitle: string
  status: string
  progress: number
  targetRoi: string
  totalBudget: string
  costToDate: string
  highlight: string
  accent: NonNullable<VariantProps<typeof badgeVariants>["variant"]>
}

type StrapiProject = {
  documentId: string
  name: string
  subtitle: string | null
  // Named phase in Strapi, not status — "status" is effectively reserved by
  // the content-manager admin UI (rejects any value as invalid, even on
  // content-types with draftAndPublish off, despite the documented
  // reserved-name rule being conditional on draftAndPublish).
  phase: string | null
  progress: number | null
  highlight: string | null
}

type StrapiInvestment = {
  documentId: string
  targetRoi: string | null
  totalBudget: string | null
  costToDate: string | null
  project: StrapiProject
}

const STATUS_ACCENT: Record<string, Project["accent"]> = {
  "Pre-Development": "blue",
  "Under Construction": "gold",
  "Fully Realized": "green",
}

function mapInvestment(investment: StrapiInvestment): Project {
  const { project } = investment
  return {
    id: project.documentId,
    name: project.name,
    subtitle: project.subtitle ?? "",
    status: project.phase ?? "",
    progress: project.progress ?? 0,
    targetRoi: investment.targetRoi ?? "—",
    totalBudget: investment.totalBudget ?? "—",
    costToDate: investment.costToDate ?? "—",
    highlight: project.highlight ?? "",
    accent: STATUS_ACCENT[project.phase ?? ""] ?? "default",
  }
}

export async function getProjects(): Promise<Project[]> {
  const investments = await strapiFetch<StrapiInvestment[]>("/investments?populate=project")
  return investments.map(mapInvestment)
}

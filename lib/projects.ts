import type { badgeVariants } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"
import { strapiFetch } from "@/lib/strapi/client"

export type ProjectNewsItem = {
  slug: string
  title: string
  publishedAt: string
}

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
  description: string
  news: ProjectNewsItem[]
  accent: NonNullable<VariantProps<typeof badgeVariants>["variant"]>
}

type StrapiNewsArticle = {
  slug: string
  title: string
  customDate: string | null
  // Strapi system field — set only once an entry is actually published
  // (draftAndPublish is enabled on News). Used to exclude drafts below
  // without depending on an untested nested populate/filter query string.
  publishedAt: string | null
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
  targetRoi: string | null
  totalBudget: string | null
  costToDate: string | null
  highlight: string | null
  description: string | null
  newsArticles: StrapiNewsArticle[] | null
}

const STATUS_ACCENT: Record<string, Project["accent"]> = {
  "Pre-Development": "blue",
  "Under Construction": "gold",
  "Fully Realized": "green",
}

const RELATED_NEWS_LIMIT = 5

function mapProject(project: StrapiProject): Project {
  return {
    id: project.documentId,
    name: project.name,
    subtitle: project.subtitle ?? "",
    status: project.phase ?? "",
    progress: project.progress ?? 0,
    targetRoi: project.targetRoi ?? "—",
    totalBudget: project.totalBudget ?? "—",
    costToDate: project.costToDate ?? "—",
    highlight: project.highlight ?? "",
    description: project.description ?? "",
    news: (project.newsArticles ?? [])
      .filter((article) => article.publishedAt) // exclude drafts
      .sort((a, b) => (b.customDate ?? "").localeCompare(a.customDate ?? ""))
      .slice(0, RELATED_NEWS_LIMIT)
      .map((article) => ({
        slug: article.slug,
        title: article.title,
        publishedAt: article.customDate ?? "",
      })),
    accent: STATUS_ACCENT[project.phase ?? ""] ?? "default",
  }
}

// Projects are a shared update visible to every logged-in investor — no
// per-account filtering, same visibility model as News. Sorting/published
// filtering for related news happens in mapProject() above, in code that's
// easy to verify, rather than a nested populate/filter/sort query string.
export async function getProjects(): Promise<Project[]> {
  const projects = await strapiFetch<StrapiProject[]>("/projects?populate=newsArticles")
  return projects.map(mapProject)
}

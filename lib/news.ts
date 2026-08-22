import { strapiFetch } from "@/lib/strapi/client"

export type NewsPost = {
  slug: string
  title: string
  excerpt: string
  content: string
  author: string
  publishedAt: string
  // Real category names, for display only (badges). Independent of the
  // category/tag fields below — surfacing real categories doesn't require
  // wiring the investment-opportunity detection, which stays static for now.
  categories?: string[]
  // category/tag remain magic-string fields used only by the still-static
  // investment-opportunity mock data below (see AGENTS.md TODO #17) — real
  // Strapi-backed posts never populate these.
  category?: string
  tag?: string
}

// This is sample data for the investment-opportunity block only — deliberately
// left static while that feature is redesigned around the real newsCategories
// relation. getNewsPosts()/getNewsPostBySlug() below are Strapi-backed.
const opportunityPosts: NewsPost[] = [
  {
    slug: "rivercroft-phase-2",
    title: "Rivercroft — Phase 2",
    excerpt:
      "Next phase of the 580-unit Drayton subdivision. Targeting 2027 opening to existing LPs first.",
    content:
      "Next phase of the 580-unit Drayton subdivision. Targeting 2027 opening to existing LPs first. Full opportunity details, budget, and timeline go here.",
    author: "Q2 Capital Partners",
    publishedAt: "2026-07-01",
    category: "Investment Opportunity",
    tag: "Coming 2027",
  },
]

export async function getInvestmentOpportunityPosts(): Promise<NewsPost[]> {
  return opportunityPosts.filter((post) => post.category === "Investment Opportunity")
}

type StrapiNewsCategory = {
  documentId: string
  title: string
}

type StrapiNewsArticle = {
  slug: string
  title: string
  excerpt: string
  body: string
  customDate: string
  newsCategories: StrapiNewsCategory[] | null
}

function mapNewsArticle(article: StrapiNewsArticle): NewsPost {
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    content: article.body,
    // No author field exists on the News content-type yet — placeholder
    // until a real byline field is added.
    author: "Q2 Capital Partners",
    publishedAt: article.customDate,
    categories: (article.newsCategories ?? []).map((c) => c.title),
  }
}

export async function getNewsPosts(): Promise<NewsPost[]> {
  const articles = await strapiFetch<StrapiNewsArticle[]>(
    "/news-articles?populate=newsCategories&status=published&sort=customDate:desc"
  )
  return articles.map(mapNewsArticle)
}

export async function getNewsPostBySlug(slug: string): Promise<NewsPost | undefined> {
  // News' custom `slug` (uid) field, not the Strapi documentId — findOne
  // only resolves by documentId, so this has to be a filtered find instead.
  const articles = await strapiFetch<StrapiNewsArticle[]>(
    `/news-articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=newsCategories&status=published`
  )
  return articles[0] ? mapNewsArticle(articles[0]) : undefined
}

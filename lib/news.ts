import type { InvestorDocument } from "@/lib/documents"
import { mapResource, type StrapiResource } from "@/lib/resources"
import { strapiFetch } from "@/lib/strapi/client"

export type NewsPost = {
  slug: string
  title: string
  excerpt: string
  content: string
  author: string
  publishedAt: string
  // Real category names, for display only (badges).
  categories?: string[]
  // Only populated by getNewsPostBySlug() — the list view doesn't need these.
  resources?: InvestorDocument[]
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
  resources?: StrapiResource[] | null
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
    resources: (article.resources ?? []).map(mapResource),
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
    `/news-articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate[newsCategories]=true&populate[resources][populate]=file&status=published`
  )
  return articles[0] ? mapNewsArticle(articles[0]) : undefined
}

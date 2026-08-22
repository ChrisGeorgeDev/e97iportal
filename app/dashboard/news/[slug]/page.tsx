import Link from "next/link"
import { notFound } from "next/navigation"

import { SetBreadcrumbTitle } from "@/components/breadcrumb-title-provider"
import { InvestmentOpportunities } from "@/components/investment-opportunities"
import { Badge } from "@/components/ui/badge"
import { getNewsPostBySlug } from "@/lib/news"

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getNewsPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-10">
      <SetBreadcrumbTitle title={post.title} />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Link
          href="/dashboard/news"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to News
        </Link>
        <article className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-medium">{post.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {post.author}
          </p>
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.categories.map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
            </div>
          )}
          <p className="mt-4 text-sm leading-relaxed">{post.content}</p>
        </article>
        {post.category === "Investment Opportunity" && (
          <InvestmentOpportunities opportunities={[post]} />
        )}
      </div>
    </div>
  )
}

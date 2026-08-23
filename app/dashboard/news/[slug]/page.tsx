import { notFound } from "next/navigation"

import { SetBreadcrumbTitle } from "@/components/breadcrumb-title-provider"
import { DocumentList } from "@/components/document-list"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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

  // Plain-text body (see AGENTS.md/docs — no markdown rendering yet), but
  // still split on blank lines so multi-paragraph articles don't collapse
  // into one dense block of text.
  const paragraphs = post.content.split(/\n\s*\n/).filter(Boolean)

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-10">
      <SetBreadcrumbTitle title={post.title} />
      <div className="mx-auto flex w-full max-w-[65ch] flex-col gap-6">
        <header className="flex flex-col gap-3">
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.categories.map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
            </div>
          )}
          <h1 className="font-heading text-2xl font-medium">{post.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {post.author}
          </p>
        </header>

        <Separator />

        <article className="flex flex-col gap-4 text-base leading-relaxed">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </article>

        {post.resources && post.resources.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <span className="text-2xs tracking-label text-muted-foreground uppercase">
                Resources
              </span>
              <DocumentList documents={post.resources} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

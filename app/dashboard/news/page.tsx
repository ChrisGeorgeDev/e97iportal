import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { getNewsPosts } from "@/lib/news"

export default async function NewsPage() {
  const posts = await getNewsPosts()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4">
      <div className="flex flex-col divide-y divide-border border-b border-border">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/dashboard/news/${post.slug}`}
            className="group flex flex-col gap-2 px-3 py-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {post.author}
              </span>
              {post.categories && post.categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.categories.map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <span className="font-heading text-xl font-medium text-foreground transition-colors group-hover:text-primary">
              {post.title}
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

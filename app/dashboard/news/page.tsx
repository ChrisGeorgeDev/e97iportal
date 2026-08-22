import Link from "next/link"

import { InvestmentOpportunities } from "@/components/investment-opportunities"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getInvestmentOpportunityPosts, getNewsPosts } from "@/lib/news"

export default async function NewsPage() {
  const [posts, opportunities] = await Promise.all([
    getNewsPosts(),
    getInvestmentOpportunityPosts(),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <InvestmentOpportunities opportunities={opportunities} />
      {posts.map((post) => (
        <Link key={post.slug} href={`/dashboard/news/${post.slug}`}>
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {post.author}
              </CardDescription>
              {post.categories && post.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {post.categories.map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>{post.excerpt}</CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

import { Badge } from "@/components/ui/badge"
import { RegisterInterestDialog } from "@/components/register-interest-dialog"
import type { NewsPost } from "@/lib/news"

export function InvestmentOpportunities({
  opportunities,
}: {
  opportunities: NewsPost[]
}) {
  if (opportunities.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 border border-primary/40 bg-primary/10 p-4">
      <div className="text-xs font-bold tracking-[0.24em] text-primary uppercase">
        New Investment Opportunities
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {opportunities.map((opportunity) => (
          <div
            key={opportunity.slug}
            className="flex flex-col gap-2 border border-border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-heading text-sm font-semibold text-foreground">
                {opportunity.title}
              </span>
              {opportunity.tag && (
                <Badge variant="gold" className="shrink-0">
                  {opportunity.tag}
                </Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {opportunity.excerpt}
            </p>
            <div>
              <RegisterInterestDialog projectName={opportunity.title} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

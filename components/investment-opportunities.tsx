import { Badge } from "@/components/ui/badge"
import { RegisterInterestCard } from "@/components/register-interest-card"
import type { InvestmentOpportunity } from "@/lib/investment-opportunities"

export function InvestmentOpportunities({
  opportunities,
}: {
  opportunities: InvestmentOpportunity[]
}) {
  if (opportunities.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 border border-primary/40 bg-primary/10 p-4">
      <div className="text-xs font-bold tracking-loud text-primary uppercase">
        New Investment Opportunities
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {opportunities.map((opportunity) => (
          <div
            key={opportunity.id}
            className="flex flex-col gap-2 border border-border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-heading text-xl font-semibold text-foreground">
                {opportunity.title}
              </span>
              {opportunity.tag && (
                <Badge variant="gold" className="shrink-0">
                  {opportunity.tag}
                </Badge>
              )}
            </div>
            <RegisterInterestCard
              opportunityId={opportunity.id}
              opportunityTitle={opportunity.title}
              excerpt={opportunity.excerpt}
              initialAmount={opportunity.myInterestAmount}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

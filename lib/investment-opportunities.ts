import { strapiFetch } from "@/lib/strapi/client"

export type InvestmentOpportunity = {
  id: string
  title: string
  excerpt: string
  tag: string | null
  // The requesting account's already-recorded interest, if any — populated
  // server-side so the card renders in its confirmed state on first paint
  // instead of flashing the idle button before a client-side check resolves.
  myInterestAmount: number | null
}

type StrapiInvestmentOpportunity = {
  documentId: string
  title: string
  excerpt: string
  tag: string | null
}

type StrapiInterestRegistration = {
  documentId: string
  amount: number
  opportunity: { documentId: string } | null
}

export async function getInvestmentOpportunities(): Promise<InvestmentOpportunity[]> {
  const [opportunities, registrations] = await Promise.all([
    strapiFetch<StrapiInvestmentOpportunity[]>("/investment-opportunities?status=published"),
    strapiFetch<StrapiInterestRegistration[]>("/interest-registrations?populate[opportunity]=true"),
  ])

  const amountByOpportunityId = new Map(
    registrations
      .filter((registration) => registration.opportunity)
      .map((registration) => [registration.opportunity!.documentId, registration.amount])
  )

  return opportunities.map((opportunity) => ({
    id: opportunity.documentId,
    title: opportunity.title,
    excerpt: opportunity.excerpt,
    tag: opportunity.tag,
    myInterestAmount: amountByOpportunityId.get(opportunity.documentId) ?? null,
  }))
}

/**
 * Called from app/api/register-interest/route.ts, not directly from client
 * components — Strapi derives the account/investor from the caller's Clerk
 * token server-side, so the client only ever sends the opportunity + amount.
 */
export async function registerInterest(
  opportunityId: string,
  amount: number,
  acknowledged: boolean
): Promise<number> {
  const result = await strapiFetch<{ amount: number }>("/interest-registrations", {
    method: "POST",
    body: JSON.stringify({ data: { opportunity: opportunityId, amount, acknowledged } }),
  })
  return result.amount
}

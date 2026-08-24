import { getStrapiAuthHeader } from "@/lib/strapi/token"

export type AccountCategory = {
  title: string
  badgeVariant: "gold" | "blue" | "green" | "amber" | "red"
}

export type Account = {
  id: string
  name: string
  categories: AccountCategory[]
}

type StrapiAccount = {
  documentId: string
  name: string
  accountCategories: AccountCategory[] | null
}

type StrapiMe = {
  account: StrapiAccount | null
}

/**
 * Populate is shallow by default — without the nested populate, `account`
 * comes back without its `accountCategories` relation at all.
 */
export async function getMyAccount(): Promise<Account | null> {
  const STRAPI_URL = process.env.STRAPI_URL
  if (!STRAPI_URL) throw new Error("STRAPI_URL is not set")

  const authHeader = await getStrapiAuthHeader()
  const res = await fetch(
    `${STRAPI_URL}/api/users/me?populate[account][populate]=accountCategories`,
    {
      headers: { ...authHeader, "Content-Type": "application/json" },
      cache: "no-store",
    }
  )
  if (!res.ok) {
    console.error(`Strapi request to /users/me failed: ${res.status} ${res.statusText}`)
    return null
  }

  const me = (await res.json()) as StrapiMe
  if (!me.account) return null

  return {
    id: me.account.documentId,
    name: me.account.name,
    categories: me.account.accountCategories ?? [],
  }
}

import { getStrapiAuthHeader } from "@/lib/strapi/token"

export type AccessCategory = "INVESTOR" | "OWNER" | "LENDER"

export type Account = {
  id: string
  name: string
  accessCategories: AccessCategory[]
}

type StrapiAccount = {
  documentId: string
  name: string
  accessCategories: AccessCategory[] | null
}

type StrapiMe = {
  account: StrapiAccount | null
}

/**
 * The current user's Account — the single source of truth for their name/
 * company and access categories, shared by the sidebar and (eventually) the
 * news category-targeting feature described in AGENTS.md.
 *
 * Uses a raw fetch rather than strapiFetch(): unlike Document Service routes,
 * /api/users/me returns the user object directly, not wrapped in {data, meta}.
 *
 * A 401 here can legitimately happen for a brand-new user in the seconds
 * right after account activation, before Clerk's user.created webhook has
 * finished linking the Strapi user — Clerk's webhooks are async/eventually
 * consistent, not something signUp.finalize() waits for. Fail soft (null)
 * instead of throwing, so a slow webhook degrades the sidebar rather than
 * crashing the whole dashboard layout.
 */
export async function getMyAccount(): Promise<Account | null> {
  const STRAPI_URL = process.env.STRAPI_URL
  if (!STRAPI_URL) throw new Error("STRAPI_URL is not set")

  const authHeader = await getStrapiAuthHeader()
  const res = await fetch(`${STRAPI_URL}/api/users/me?populate=account`, {
    headers: { ...authHeader, "Content-Type": "application/json" },
    cache: "no-store",
  })
  if (!res.ok) {
    console.error(`Strapi request to /users/me failed: ${res.status} ${res.statusText}`)
    return null
  }

  const me = (await res.json()) as StrapiMe
  if (!me.account) return null

  return {
    id: me.account.documentId,
    name: me.account.name,
    accessCategories: me.account.accessCategories ?? [],
  }
}

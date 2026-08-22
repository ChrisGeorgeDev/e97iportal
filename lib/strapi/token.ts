import { auth } from "@clerk/nextjs/server"

/**
 * Forwards the current user's Clerk session token to Strapi as a bearer
 * token. No JWT template is used — Strapi verifies this default session
 * token directly against Clerk's JWKS and resolves the account via its own
 * clerk_id lookup, so no custom claims need to be embedded here.
 */
export async function getStrapiAuthHeader(): Promise<HeadersInit> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error("Not authenticated")
  return { Authorization: `Bearer ${token}` }
}

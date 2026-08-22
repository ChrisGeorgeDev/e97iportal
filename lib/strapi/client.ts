import { getStrapiAuthHeader } from "./token"

const STRAPI_URL = process.env.STRAPI_URL

/**
 * Thin fetch wrapper for Strapi's REST API. No client-added account filters
 * are applied here — Strapi's own policies scope every query server-side to
 * the caller's account, so this only forwards the caller's identity.
 */
export async function strapiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!STRAPI_URL) throw new Error("STRAPI_URL is not set")

  const authHeader = await getStrapiAuthHeader()
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    ...init,
    headers: { ...authHeader, "Content-Type": "application/json", ...init?.headers },
    // Per-account data — avoid Next's data cache bleeding a response across users.
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Strapi request to ${path} failed: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  return json.data as T
}

/** Like strapiFetch, but returns undefined instead of throwing on a 404 — for findOne-by-id lookups. */
export async function strapiFetchOptional<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  if (!STRAPI_URL) throw new Error("STRAPI_URL is not set")

  const authHeader = await getStrapiAuthHeader()
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    ...init,
    headers: { ...authHeader, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  })

  if (res.status === 404) return undefined
  if (!res.ok) {
    throw new Error(`Strapi request to ${path} failed: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  return json.data as T
}

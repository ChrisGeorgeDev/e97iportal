import { NextResponse } from "next/server"

import { getStrapiAuthHeader } from "@/lib/strapi/token"

const STRAPI_URL = process.env.STRAPI_URL

// Strapi v5 documentIds are cuid2 (strapi/core's transform-content-types-to-models.js
// uses cuid2's createId directly) — lowercase alphanumeric, no separators. documentId
// comes straight from the URL's dynamic route segment, so it must be validated before
// being placed into the Strapi request path — an unvalidated value here would let a
// caller redirect this same-origin, authenticated proxy at an arbitrary Strapi path.
const DOCUMENT_ID_PATTERN = /^[a-z0-9]{20,32}$/

/**
 * Forwards a download request to Strapi with the caller's Clerk token and
 * streams the response straight back — the blob URL and Azure credentials
 * never reach the browser, only this same-origin route. `collection` is
 * always a fixed string literal supplied by the calling route file, never
 * derived from the request.
 */
export async function proxyStrapiDownload(
  collection: "documents" | "portfolio-reports" | "resources",
  documentId: string
): Promise<NextResponse> {
  if (!STRAPI_URL) throw new Error("STRAPI_URL is not set")
  if (!DOCUMENT_ID_PATTERN.test(documentId)) {
    return new NextResponse(null, { status: 400 })
  }

  const authHeader = await getStrapiAuthHeader()
  const res = await fetch(`${STRAPI_URL}/api/${collection}/${documentId}/download`, {
    headers: authHeader,
    cache: "no-store",
  })

  if (!res.ok || !res.body) {
    return new NextResponse(null, { status: res.status })
  }

  const headers: HeadersInit = {
    "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
  }
  const disposition = res.headers.get("content-disposition")
  if (disposition) headers["Content-Disposition"] = disposition

  return new NextResponse(res.body, { status: 200, headers })
}

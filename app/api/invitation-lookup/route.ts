import { NextRequest, NextResponse } from "next/server"

const STRAPI_URL = process.env.STRAPI_URL

/**
 * Proxies the public Strapi invitation-lookup endpoint. Needed because
 * STRAPI_URL is deliberately server-only (no NEXT_PUBLIC_ prefix), but the
 * sign-up page needs this from a client component reacting to Clerk's
 * client-side ticket-consumption state.
 */
export async function GET(request: NextRequest) {
  if (!STRAPI_URL) {
    return NextResponse.json({ firstName: null, lastName: null })
  }

  const email = request.nextUrl.searchParams.get("email")
  if (!email) {
    return NextResponse.json({ firstName: null, lastName: null })
  }

  const res = await fetch(
    `${STRAPI_URL}/api/invitation-lookup?email=${encodeURIComponent(email)}`,
    { cache: "no-store" }
  )
  if (!res.ok) {
    return NextResponse.json({ firstName: null, lastName: null })
  }

  const data = await res.json()
  return NextResponse.json(data)
}

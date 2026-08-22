import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

const STRAPI_URL = process.env.STRAPI_URL

/**
 * Tells the sign-up page whether Clerk's user.created webhook has finished
 * linking this user's Strapi account yet. Webhooks are async/eventually
 * consistent, so signUp.finalize() completing doesn't guarantee Strapi has
 * caught up — the sign-up page polls this briefly before navigating to the
 * dashboard, instead of navigating immediately and racing the webhook.
 */
export async function GET() {
  if (!STRAPI_URL) return NextResponse.json({ ready: false })

  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return NextResponse.json({ ready: false })

  const res = await fetch(`${STRAPI_URL}/api/users/me?populate=account`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) return NextResponse.json({ ready: false })

  const me = await res.json()
  return NextResponse.json({ ready: Boolean(me.account) })
}

import { NextRequest, NextResponse } from "next/server"

import { registerInterest } from "@/lib/investment-opportunities"

export async function POST(request: NextRequest) {
  const { opportunityId, amount, acknowledged } = await request.json()

  if (typeof opportunityId !== "string" || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid opportunity or amount" }, { status: 400 })
  }
  if (acknowledged !== true) {
    return NextResponse.json({ error: "Acknowledgement is required" }, { status: 400 })
  }

  try {
    const recordedAmount = await registerInterest(opportunityId, amount, acknowledged)
    return NextResponse.json({ amount: recordedAmount })
  } catch {
    return NextResponse.json({ error: "Failed to register interest" }, { status: 500 })
  }
}

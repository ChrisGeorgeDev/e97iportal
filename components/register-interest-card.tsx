"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function RegisterInterestCard({
  opportunityId,
  opportunityTitle,
  excerpt,
  initialAmount,
}: {
  opportunityId: string
  opportunityTitle: string
  excerpt: string
  initialAmount: number | null
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(initialAmount)

  const flipped = confirmedAmount !== null
  const parsedAmount = Number(amount)
  const canSubmit = agreed && amount.trim() !== "" && parsedAmount > 0 && !submitting

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/register-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, amount: parsedAmount, acknowledged: agreed }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setConfirmedAmount(data.amount)
    } catch {
      setError("Something went wrong — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex-1 [perspective:1000px]">
      <div
        className={cn(
          "relative h-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none",
          flipped && "[transform:rotateY(180deg)]"
        )}
      >
        {/* Front face: idle button or inline form. flex-1 on the excerpt
            absorbs the leftover height from grid row-stretching, so the
            button/form block bottom-aligns across cards of different
            excerpt lengths instead of trailing right after its own text. */}
        <div className="flex h-full flex-col gap-2 [backface-visibility:hidden]">
          <p className="flex-1 text-base leading-relaxed text-muted-foreground">
            {excerpt}
          </p>
          {!formOpen ? (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              Register Interest
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`amount-${opportunityId}`} className="text-xs">
                Total amount you&apos;re willing to commit
              </Label>
              <Input
                id={`amount-${opportunityId}`}
                type="number"
                min="1"
                step="0.01"
                placeholder="$0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id={`ack-${opportunityId}`}
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                />
                <Label htmlFor={`ack-${opportunityId}`} className="font-normal">
                  I acknowledge the amount may be drawn in stages, at any point
                  during the project, via capital call notices.
                </Label>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => {
                    setFormOpen(false)
                    setAmount("")
                    setAgreed(false)
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Back face: confirmation, shown after a successful submit (or on
            load if this account already has a recorded amount). */}
        <div className="absolute inset-0 flex flex-col justify-center gap-1 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-base leading-relaxed text-muted-foreground">
            You&apos;re registered for {opportunityTitle} at{" "}
            <span className="font-semibold text-foreground">
              {confirmedAmount !== null ? formatCurrency(confirmedAmount) : ""}
            </span>
            . Our team will follow up with next steps.
          </p>
        </div>
      </div>
    </div>
  )
}

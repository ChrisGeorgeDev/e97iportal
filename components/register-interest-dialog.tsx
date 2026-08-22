"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export function RegisterInterestDialog({
  projectName,
}: {
  projectName: string
}) {
  const [open, setOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setAgreed(false)
          setSubmitted(false)
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        Register Interest
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Investment Opportunity</DialogTitle>
          {!submitted && (
            <DialogDescription>
              Register your interest and our team will follow up with more
              details as they become available.
            </DialogDescription>
          )}
        </DialogHeader>
        {submitted ? (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Thanks — you&apos;re registered for {projectName}. Our team
              will follow up with next steps.
            </p>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <Checkbox
                id="register-interest-consent"
                checked={agreed}
                onCheckedChange={setAgreed}
              />
              <Label
                htmlFor="register-interest-consent"
                className="font-normal"
              >
                Register me for interest in {projectName}
              </Label>
            </div>
            <DialogFooter>
              <Button disabled={!agreed} onClick={() => setSubmitted(true)}>
                Complete Registration
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

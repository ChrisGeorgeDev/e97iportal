"use client"

import { createContext, useContext, useState } from "react"

import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function getHostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const ExternalLinkPromptContext = createContext<((url: string) => void) | null>(null)

/**
 * Wraps a subtree so any descendant can call useExternalLinkPrompt() to show
 * a "you're leaving the site" confirmation before navigating off-site —
 * shared across any number of links instead of each owning its own dialog.
 */
export function ExternalLinkDialogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  return (
    <ExternalLinkPromptContext.Provider value={setPendingUrl}>
      {children}
      <Dialog
        open={pendingUrl !== null}
        onOpenChange={(open) => !open && setPendingUrl(null)}
      >
        <DialogContent className="border-t-2 border-t-primary bg-foreground p-8 text-background ring-background/15 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Leaving the investor portal
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-background">
              We&apos;ve chosen to share this link because we think it&apos;s
              useful, but we don&apos;t manage or control it. Click continue
              to visit{" "}
              <span className="font-medium text-background">
                {pendingUrl ? getHostname(pendingUrl) : ""}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              render={
                <a href={pendingUrl ?? "#"} target="_blank" rel="noopener noreferrer" />
              }
              // Deferred: resetting synchronously re-renders the anchor's
              // href down to "#" before the browser reads it to open the
              // new tab, so the new tab loads the portal itself instead of
              // the destination. Closing on the next tick lets the browser
              // act on the real href first.
              onClick={() => setTimeout(() => setPendingUrl(null), 0)}
            >
              Continue to Site
              <ArrowSquareOutIcon />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ExternalLinkPromptContext.Provider>
  )
}

export function useExternalLinkPrompt() {
  const promptExternalLink = useContext(ExternalLinkPromptContext)
  if (!promptExternalLink) {
    throw new Error(
      "useExternalLinkPrompt must be used within an ExternalLinkDialogProvider"
    )
  }
  return promptExternalLink
}

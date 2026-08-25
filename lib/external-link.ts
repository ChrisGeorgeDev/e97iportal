import type { MouseEvent } from "react"

export function isExternalHref(href: string): boolean {
  try {
    return new URL(href, window.location.origin).origin !== window.location.origin
  } catch {
    return false
  }
}

// Works both as a direct anchor onClick (closest("a") matches the anchor
// itself) and, unchanged, as a delegated onClick on a container of
// CMS-rendered HTML (closest("a") walks up to whichever link was clicked).
// Skips modifier/middle clicks so native "open in new tab"/"open in
// background" behavior keeps working without the interstitial — same
// reasoning real-world implementations use for this pattern. Note: a
// right-click → "open link in new tab" from the browser's own context menu
// bypasses this entirely (no click event fires) — an accepted limitation of
// client-side interception, not fixable without a server-side redirect hop.
export function interceptExternalLinkClick(
  event: MouseEvent,
  onExternal: (url: string) => void
) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return
  }
  const anchor = (event.target as HTMLElement).closest("a")
  if (!anchor?.href || !isExternalHref(anchor.href)) return
  event.preventDefault()
  onExternal(anchor.href)
}

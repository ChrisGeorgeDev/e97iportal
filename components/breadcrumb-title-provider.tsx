"use client"

import { createContext, useContext, useEffect, useState } from "react"

type BreadcrumbTitleContextValue = {
  title: string | null
  setTitle: (title: string | null) => void
}

const BreadcrumbTitleContext =
  createContext<BreadcrumbTitleContextValue | null>(null)

export function BreadcrumbTitleProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [title, setTitle] = useState<string | null>(null)

  return (
    <BreadcrumbTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </BreadcrumbTitleContext.Provider>
  )
}

export function useBreadcrumbTitle() {
  const context = useContext(BreadcrumbTitleContext)
  if (!context) {
    throw new Error(
      "useBreadcrumbTitle must be used within a BreadcrumbTitleProvider"
    )
  }
  return context
}

/**
 * Lets a page override the last breadcrumb segment with a real title
 * (e.g. a fetched post/report title) instead of the URL-slug fallback.
 */
export function SetBreadcrumbTitle({ title }: { title: string }) {
  const { setTitle } = useBreadcrumbTitle()

  useEffect(() => {
    setTitle(title)
    return () => setTitle(null)
  }, [title, setTitle])

  return null
}

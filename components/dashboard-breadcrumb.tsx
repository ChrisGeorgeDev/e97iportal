"use client"

import { Fragment } from "react"
import { usePathname } from "next/navigation"

import { useBreadcrumbTitle } from "@/components/breadcrumb-title-provider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

function formatSegment(segment: string) {
  return decodeURIComponent(segment)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()
  const { title: overrideTitle } = useBreadcrumbTitle()
  const segments = pathname
    .replace(/^\/dashboard\/?/, "")
    .split("/")
    .filter(Boolean)

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    ...segments.map((segment, index) => ({
      label: formatSegment(segment),
      href: `/dashboard/${segments.slice(0, index + 1).join("/")}`,
    })),
  ]

  if (overrideTitle && crumbs.length > 1) {
    crumbs[crumbs.length - 1] = {
      ...crumbs[crumbs.length - 1],
      label: overrideTitle,
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={crumb.href}>
              <BreadcrumbItem className={cn(!isLast && "hidden md:flex")}>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

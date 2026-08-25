"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"

import {
  ArrowSquareOutIcon,
  CaretRightIcon,
} from "@phosphor-icons/react/dist/ssr"

import { useExternalLinkPrompt } from "@/components/external-link-dialog"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { interceptExternalLinkClick } from "@/lib/external-link"
import type { Property } from "@/lib/properties"

const linksBeforeProperty = [
  { href: "/dashboard/portfolio", label: "My Portfolio" },
  { href: "/dashboard/news", label: "News" },
  { href: "/dashboard/projects", label: "Active Projects" },
]

const linksAfterProperty = [
  { href: "/dashboard/documents", label: "Documents" },
]

export function PrimaryNav({ properties }: { properties: Property[] }) {
  const pathname = usePathname()
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false)
  const promptExternalLink = useExternalLinkPrompt()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {linksBeforeProperty.map((link) => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                isActive={pathname.startsWith(link.href)}
                render={<a href={link.href} />}
              >
                {link.label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {properties.length === 1 && (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <a
                    href={properties[0].portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) =>
                      interceptExternalLinkClick(event, promptExternalLink)
                    }
                  />
                }
              >
                My Property
                <ArrowSquareOutIcon className="ml-auto" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {properties.length > 1 && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setPropertyMenuOpen((open) => !open)}
              >
                My Property
                <CaretRightIcon
                  className={`ml-auto transition-transform ${
                    propertyMenuOpen ? "rotate-90" : ""
                  }`}
                />
              </SidebarMenuButton>
              {propertyMenuOpen && (
                <SidebarMenuSub>
                  {properties.map((property) => (
                    <SidebarMenuSubItem key={property.id}>
                      <SidebarMenuSubButton
                        href={property.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) =>
                          interceptExternalLinkClick(event, promptExternalLink)
                        }
                      >
                        <span className="truncate">{property.address}</span>
                        <ArrowSquareOutIcon className="ml-auto" />
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}

          {linksAfterProperty.map((link) => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                isActive={pathname.startsWith(link.href)}
                render={<a href={link.href} />}
              >
                {link.label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

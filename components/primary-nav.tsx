"use client"

import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const links = [
  { href: "/dashboard/portfolio", label: "My Portfolio" },
  { href: "/dashboard/news", label: "News" },
  { href: "/dashboard/projects", label: "Active Projects" },
  { href: "/dashboard/property", label: "My Property" },
  { href: "/dashboard/documents", label: "Documents" },
]

export function PrimaryNav() {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {links.map((link) => (
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

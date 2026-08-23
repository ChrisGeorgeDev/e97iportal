import { SignOutButton } from "@clerk/nextjs"
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr"

import { AppSidebar } from "@/components/app-sidebar"
import { BreadcrumbTitleProvider } from "@/components/breadcrumb-title-provider"
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BreadcrumbTitleProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <Tooltip>
              <TooltipTrigger render={<SidebarTrigger className="-ml-1" />} />
              <TooltipContent>Toggle Sidebar</TooltipContent>
            </Tooltip>
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <DashboardBreadcrumb />
            <div className="ml-auto">
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <SignOutButton redirectUrl="/sign-in">
                    <Button variant="ghost" size="icon" aria-label="Sign out">
                      <SignOutIcon />
                    </Button>
                  </SignOutButton>
                </TooltipTrigger>
                <TooltipContent>Sign Out</TooltipContent>
              </Tooltip>
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbTitleProvider>
  )
}

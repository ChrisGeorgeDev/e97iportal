import { UserButton } from "@clerk/nextjs"

import { AppSidebar } from "@/components/app-sidebar"
import { BreadcrumbTitleProvider } from "@/components/breadcrumb-title-provider"
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

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
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <DashboardBreadcrumb />
            <div className="ml-auto">
              <UserButton />
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbTitleProvider>
  )
}

import { currentUser } from "@clerk/nextjs/server"
import {
  BuildingsIcon,
  FolderIcon,
  NewspaperIcon,
} from "@phosphor-icons/react/dist/ssr"

import { SectionCard } from "@/components/section-card"
import { WelcomeCard } from "@/components/welcome-card"

const sections = [
  {
    href: "/dashboard/news",
    icon: NewspaperIcon,
    title: "News",
    description: "Company announcements and market updates.",
  },
  {
    href: "/dashboard/projects",
    icon: BuildingsIcon,
    title: "Active Projects",
    description: "Track progress across the development pipeline.",
  },
  {
    href: "/dashboard/documents",
    icon: FolderIcon,
    title: "Document Centre",
    description: "Statements, reports, and agreements in one place.",
  },
]

export default async function DashboardPage() {
  const user = await currentUser()

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-4 md:auto-rows-[minmax(180px,1fr)]">
      <WelcomeCard
        firstName={user?.firstName ?? ""}
        className="md:col-span-2 md:row-span-2"
      />
      {sections.map((section, index) => (
        <SectionCard
          key={section.href}
          href={section.href}
          icon={section.icon}
          title={section.title}
          description={section.description}
          className={index === 0 ? "md:col-span-2" : undefined}
        />
      ))}
    </div>
  )
}

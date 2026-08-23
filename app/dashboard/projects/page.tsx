import { InvestmentOpportunities } from "@/components/investment-opportunities"
import { ProjectList } from "@/components/project-list"
import { getInvestmentOpportunities } from "@/lib/investment-opportunities"
import { getProjects } from "@/lib/projects"

export default async function ProjectsPage() {
  const [projects, opportunities] = await Promise.all([
    getProjects(),
    getInvestmentOpportunities(),
  ])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
      <ProjectList projects={projects} />
      <InvestmentOpportunities opportunities={opportunities} />
    </div>
  )
}

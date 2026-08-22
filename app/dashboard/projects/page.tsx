import { ProjectList } from "@/components/project-list"
import { getProjects } from "@/lib/projects"

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <ProjectList projects={projects} />
    </div>
  )
}

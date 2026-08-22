"use client"

import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { Project } from "@/lib/projects"

export function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => (
        <Sheet key={project.id}>
          <SheetTrigger className="flex flex-col gap-3 border border-border bg-card p-4 text-left transition-colors hover:bg-accent">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <Badge variant={project.accent} className="w-fit">
                  {project.status}
                </Badge>
                <span className="font-heading text-sm font-semibold text-foreground">
                  {project.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {project.subtitle}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  Target ROI
                </span>
                <span className="text-sm font-semibold text-primary">
                  {project.targetRoi}
                </span>
              </div>
            </div>
            {project.progress < 100 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                    Progress
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {project.progress}%
                  </span>
                </div>
                <div className="h-1 bg-muted">
                  <div
                    className="h-1 bg-primary"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {project.highlight}
            </p>
          </SheetTrigger>
          <SheetContent showCloseButton={false}>
            <SheetHeader>
              <SheetTitle>{project.name}</SheetTitle>
              <SheetDescription>{project.subtitle}</SheetDescription>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 p-4">
              {(
                [
                  ["Total Budget", project.totalBudget],
                  ["Cost to Date", project.costToDate],
                  ["Target ROI", project.targetRoi],
                  ["Status", project.status],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 border border-border bg-muted/40 p-3"
                >
                  <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  )
}

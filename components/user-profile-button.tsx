"use client"

import { useClerk } from "@clerk/nextjs"
import { GearIcon } from "@phosphor-icons/react/dist/ssr"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function UserProfileButton({ className }: { className?: string }) {
  const { openUserProfile } = useClerk()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => openUserProfile()}
            aria-label="User settings"
            className={cn(
              "text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground",
              className
            )}
          />
        }
      >
        <GearIcon className="size-4" />
      </TooltipTrigger>
      <TooltipContent>User Settings</TooltipContent>
    </Tooltip>
  )
}

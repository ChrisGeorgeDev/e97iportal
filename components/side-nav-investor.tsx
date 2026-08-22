import { currentUser } from "@clerk/nextjs/server"
import { Badge, badgeVariants } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getMyAccount, type AccessCategory } from "@/lib/account"
import type { VariantProps } from "class-variance-authority"

const CATEGORY_VARIANT: Record<AccessCategory, NonNullable<VariantProps<typeof badgeVariants>["variant"]>> = {
  INVESTOR: "gold",
  OWNER: "blue",
  LENDER: "amber",
}

export async function SideNavInvestor() {
  const [user, account] = await Promise.all([currentUser(), getMyAccount()])

  const name = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : ""
  const company = account?.name ?? ""
  const categories = account?.accessCategories ?? []

  return (
    <div className="side-nav-investor flex flex-col gap-1.5 border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="block truncate text-left text-sm font-medium text-sidebar-foreground" />
          }
        >
          {name}
        </TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="block truncate text-left text-xs text-sidebar-foreground/70" />
          }
        >
          {company}
        </TooltipTrigger>
        <TooltipContent>{company}</TooltipContent>
      </Tooltip>
      <div className="flex flex-wrap gap-1 pt-0.5">
        {categories.map((category) => (
          <Badge key={category} variant={CATEGORY_VARIANT[category]}>
            {category}
          </Badge>
        ))}
      </div>
    </div>
  )
}

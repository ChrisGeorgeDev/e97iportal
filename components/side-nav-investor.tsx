import { currentUser } from "@clerk/nextjs/server"
import { Badge } from "@/components/ui/badge"
import { UserProfileButton } from "@/components/user-profile-button"
import { getMyAccount } from "@/lib/account"

export async function SideNavInvestor() {
  const [user, account] = await Promise.all([currentUser(), getMyAccount()])

  const name = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : ""
  const company = account?.name ?? ""
  const categories = account?.categories ?? []
  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((part) => part![0])
    .join("")
    .toUpperCase()

  return (
    <div className="side-nav-investor relative flex flex-col gap-2 border border-sidebar-border bg-sidebar-accent/40 py-2 pr-2.5 pl-2.5">
      <UserProfileButton className="absolute top-2 right-2" />
      <div className="flex items-start gap-2 pr-5">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-1 border-primary text-xs text-primary">
          {initials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="block truncate text-left text-sm font-medium text-sidebar-foreground">
            {name}
          </span>
          <span className="block truncate text-left text-xs text-sidebar-foreground/70">
            {company}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {categories.map((category) => (
          <Badge className="uppercase" key={category.title} variant={category.badgeVariant}>
            {category.title}
          </Badge>
        ))}
      </div>
    </div>
  )
}

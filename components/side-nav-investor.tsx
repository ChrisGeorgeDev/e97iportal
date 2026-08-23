import { currentUser } from "@clerk/nextjs/server"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { UserProfileButton } from "@/components/user-profile-button"
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
    <div className="side-nav-investor relative flex items-start gap-2 border border-sidebar-border bg-sidebar-accent/40 py-2 pr-2.5 pl-2.5">
      <UserProfileButton className="absolute top-2 right-2" />
      {user?.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- external Clerk avatar URL, no next/image remote pattern configured
        <img
          src={user.imageUrl}
          alt=""
          className="mt-0.5 size-8 shrink-0 rounded-full"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pr-5">
        <span className="block truncate text-left text-sm font-medium text-sidebar-foreground">
          {name}
        </span>
        <span className="block truncate text-left text-xs text-sidebar-foreground/70">
          {company}
        </span>
        <div className="flex flex-wrap gap-1 pt-0.5">
          {categories.map((category) => (
            <Badge key={category} variant={CATEGORY_VARIANT[category]}>
              {category}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

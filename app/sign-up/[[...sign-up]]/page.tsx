"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSignUp } from "@clerk/nextjs"
import { redirect, useRouter, useSearchParams } from "next/navigation"
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"

// Self-serve sign-up is disabled — investor accounts are only created via an
// admin-issued invitation. This page's only job is to consume the
// __clerk_ticket from that invitation email and finish account setup; a
// cold visit with no ticket redirects to sign-in, same as before.
function AcceptInvitation() {
  const { signUp, errors, fetchStatus } = useSignUp()
  const router = useRouter()
  const ticket = useSearchParams().get("__clerk_ticket")
  const attempted = useRef(false)
  const [showPassword, setShowPassword] = useState(false)
  const [prefill, setPrefill] = useState({ firstName: "", lastName: "" })

  // Clerk's user.created webhook (which links this session to its Strapi
  // account) is async/eventually-consistent — it isn't guaranteed to have
  // finished the instant finalize() resolves. Poll briefly before navigating
  // so the dashboard doesn't race it and 401 on first load.
  const waitForAccountReady = async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await fetch("/api/account-ready", { cache: "no-store" })
      const { ready } = await res.json()
      if (ready) return
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
  }

  const goToDashboard = async () => {
    await signUp.finalize({
      navigate: async ({ decorateUrl }) => {
        await waitForAccountReady()
        const url = decorateUrl("/dashboard")
        if (url.startsWith("http")) {
          window.location.href = url
        } else {
          router.push(url)
        }
      },
    })
  }

  useEffect(() => {
    if (!ticket || attempted.current) return
    attempted.current = true

    void signUp.ticket({ ticket }).then(async ({ error }) => {
      if (!error && signUp.status === "complete") {
        await goToDashboard()
        return
      }

      // Prefill name fields from the matching Strapi invitation, if any —
      // the user can still edit them before activating.
      if (signUp.emailAddress) {
        const res = await fetch(
          `/api/invitation-lookup?email=${encodeURIComponent(signUp.emailAddress)}`
        )
        const data = await res.json()
        setPrefill({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket])

  const handleActivateSubmit = async (formData: FormData) => {
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const password = formData.get("password") as string

    const { error: updateError } = await signUp.update({ firstName, lastName })
    if (updateError) return

    const { error: passwordError } = await signUp.password({ password })
    if (passwordError) return

    if (signUp.status === "complete") {
      await goToDashboard()
    }
  }

  if (!ticket) {
    redirect("/sign-in")
  }

  const needsPassword = signUp.missingFields?.includes("password")

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, #111c2e88 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, #c9a96e0a 0%, transparent 50%)",
        }}
      />
      <div className="relative z-10 w-full max-w-[400px] border border-border bg-card shadow-[0_40px_100px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col items-center border-b border-border bg-background px-8 py-6 text-center">
          <img
            src="/ui/q2-capital-partners-brand-logo.png"
            alt="Q2 Capital Partners"
            className="mb-3.5 h-10 w-auto"
          />
          <div className="text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            Investor Portal
          </div>
        </div>

        {/* Clerk's bot-protection CAPTCHA widget mounts here. Present
            unconditionally (not just inside the password form) since Clerk
            can attempt to initialize it as soon as the SignUp resource is
            available, before missingFields resolves. */}
        <div id="clerk-captcha" />

        {needsPassword ? (
          <form
            action={handleActivateSubmit}
            className="flex flex-col gap-4 px-7 py-5.5"
          >
            <p className="text-xs leading-relaxed text-muted-foreground">
              Welcome. Tell us your name and set a password to finish
              activating your account.
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label
                  htmlFor="firstName"
                  className="mb-1.5 block text-[9px] tracking-[0.12em] text-muted-foreground uppercase"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={prefill.firstName}
                  onChange={(e) =>
                    setPrefill((p) => ({ ...p, firstName: e.target.value }))
                  }
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
                />
                {errors?.fields?.firstName && (
                  <p className="mt-1 text-[10px] text-destructive">
                    {errors.fields.firstName.message}
                  </p>
                )}
              </div>
              <div className="flex-1">
                <label
                  htmlFor="lastName"
                  className="mb-1.5 block text-[9px] tracking-[0.12em] text-muted-foreground uppercase"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={prefill.lastName}
                  onChange={(e) =>
                    setPrefill((p) => ({ ...p, lastName: e.target.value }))
                  }
                  className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
                />
                {errors?.fields?.lastName && (
                  <p className="mt-1 text-[10px] text-destructive">
                    {errors.fields.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[9px] tracking-[0.12em] text-muted-foreground uppercase"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="w-full border border-border bg-background px-3 py-2.5 pr-9 text-sm text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
              {errors?.fields?.password && (
                <p className="mt-1 text-[10px] text-destructive">
                  {errors.fields.password.message}
                </p>
              )}
            </div>
            {errors?.global && errors.global.length > 0 && (
              <p className="text-[10px] text-destructive">
                {errors.global[0].message}
              </p>
            )}
            <button
              type="submit"
              disabled={fetchStatus === "fetching"}
              className="bg-primary py-3.5 text-xs font-bold tracking-[0.22em] text-primary-foreground uppercase disabled:opacity-50"
            >
              Activate Account →
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4 px-7 py-5.5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Completing your invitation…
            </p>
            {errors?.global && errors.global.length > 0 && (
              <p className="text-[10px] text-destructive">
                {errors.global[0].message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitation />
    </Suspense>
  )
}

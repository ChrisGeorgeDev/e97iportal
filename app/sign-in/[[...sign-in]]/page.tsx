"use client"

import { useState } from "react"
import { useSignIn } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"

export default function SignInPage() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const goToDashboard = async () => {
    await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl("/dashboard")
        if (url.startsWith("http")) {
          window.location.href = url
        } else {
          router.push(url)
        }
      },
    })
  }

  const handlePasswordSubmit = async (formData: FormData) => {
    const emailAddress = formData.get("email") as string
    const password = formData.get("password") as string

    const { error } = await signIn.password({ emailAddress, password })
    if (error) return

    if (signIn.status === "complete") {
      await goToDashboard()
    } else if (signIn.status === "needs_client_trust") {
      await signIn.mfa.sendEmailCode()
    }
  }

  const handleVerifySubmit = async (formData: FormData) => {
    const code = formData.get("code") as string

    const { error } = await signIn.mfa.verifyEmailCode({ code })
    if (error) return

    if (signIn.status === "complete") {
      await goToDashboard()
    }
  }

  const needsDeviceVerification = signIn.status === "needs_client_trust"

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
          <div className="text-2xs tracking-label text-muted-foreground uppercase">
            Investor Portal
          </div>
        </div>

        {needsDeviceVerification ? (
          <form
            action={handleVerifySubmit}
            className="flex flex-col gap-4 px-7 py-5.5"
          >
            <p className="text-xs leading-relaxed text-muted-foreground">
              We sent a verification code to your email to confirm this new
              device. Enter it below to continue.
            </p>
            <div>
              <label
                htmlFor="code"
                className="mb-1.5 block text-2xs tracking-label text-muted-foreground uppercase"
              >
                Verification Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                autoComplete="one-time-code"
                className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
              />
              {errors?.fields?.code && (
                <p className="mt-1 text-2xs text-destructive">
                  {errors.fields.code.message}
                </p>
              )}
            </div>
            {errors?.global && errors.global.length > 0 && (
              <p className="text-2xs text-destructive">
                {errors.global[0].message}
              </p>
            )}
            <button
              type="submit"
              disabled={fetchStatus === "fetching"}
              className="bg-primary py-3.5 text-xs font-bold tracking-loud text-primary-foreground uppercase disabled:opacity-50"
            >
              Verify →
            </button>
          </form>
        ) : (
          <form
            action={handlePasswordSubmit}
            className="flex flex-col gap-4 px-7 py-5.5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-2xs tracking-label text-muted-foreground uppercase"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
              />
              {errors?.fields?.identifier && (
                <p className="mt-1 text-2xs text-destructive">
                  {errors.fields.identifier.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-2xs tracking-label text-muted-foreground uppercase"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
                <p className="mt-1 text-2xs text-destructive">
                  {errors.fields.password.message}
                </p>
              )}
            </div>
            {errors?.global && errors.global.length > 0 && (
              <p className="text-2xs text-destructive">
                {errors.global[0].message}
              </p>
            )}
            <button
              type="submit"
              disabled={fetchStatus === "fetching"}
              className="bg-primary py-3.5 text-xs font-bold tracking-loud text-primary-foreground uppercase disabled:opacity-50"
            >
              Sign In →
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

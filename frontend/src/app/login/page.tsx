"use client"

import { signIn } from "@/lib/auth/auth-client"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"
import { SiGithub, SiLinkedin } from "react-icons/si"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const handleGitHubSignIn = async () => {
    await signIn.social({
      provider: "github",
      callbackURL: callbackUrl,
    })
  }

  const handleLinkedInSignIn = async () => {
    await signIn.social({
      provider: "linkedin",
      callbackURL: callbackUrl,
    })
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-md space-y-6 pt-0 pb-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Gaither</h1>
          <p className="text-muted-foreground">
            Sign in to access your dashboard
          </p>
        </div>
        <div className="space-y-3">
          <Button
            onClick={handleLinkedInSignIn}
            className="w-full cursor-pointer flex items-center justify-center"
            size="lg"
          >
            <SiLinkedin className="mr-2 h-5 w-5 flex-shrink-0" />
            <span className="text-sm sm:text-base whitespace-normal text-center">
              Continue with LinkedIn as Recruiter
            </span>
          </Button>
          <Button
            onClick={handleGitHubSignIn}
            className="w-full cursor-pointer flex items-center justify-center"
            size="lg"
          >
            <SiGithub className="mr-2 h-5 w-5 flex-shrink-0" />
            <span className="text-sm sm:text-base whitespace-normal text-center">
              Continue with GitHub as Candidate
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}


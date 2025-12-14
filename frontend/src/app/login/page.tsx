"use client"

import { Suspense } from "react"
import { LoginForm } from "@/features/Auth/components/login-form"

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="mx-auto w-full max-w-md space-y-6 pt-0 pb-6 px-4">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-foreground">Welcome to Gaither</h1>
            <p className="text-muted-foreground">
              Sign in to access your dashboard
            </p>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}


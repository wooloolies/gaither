"use client"

import { Suspense } from "react"
import { LoginForm } from "@/features/auth/components/login-form"

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="relative flex-1 flex items-center justify-center bg-background">
        {/* Subtle pixel grid background */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                'linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md space-y-6 pt-0 pb-6 px-4">
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


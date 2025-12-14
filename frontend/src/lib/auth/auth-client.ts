"use client"

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:5173",
})

export const { signIn, signOut, signUp, useSession, listAccounts } = authClient

// Export the Session type for use in other files
export type Session = typeof authClient.$Infer.Session

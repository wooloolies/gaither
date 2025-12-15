'use client'

import * as React from 'react'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from 'sonner'
import dynamic from 'next/dynamic'

const TanStackDevtoolsWrapper = process.env.NODE_ENV !== 'production'
  ? dynamic(
    () => import('@/components/providers/tanstack-devtools').then(
      (mod) => mod.TanStackDevtoolsWrapper
    ),
    { ssr: false }
  )
  : null

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
        <Toaster position="bottom-right" richColors />
        {process.env.NODE_ENV !== 'production' && TanStackDevtoolsWrapper && <TanStackDevtoolsWrapper />}
      </ThemeProvider>
    </QueryProvider>
  )
}

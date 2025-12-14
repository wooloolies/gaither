'use client'

import * as React from 'react'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import dynamic from 'next/dynamic'

const TanStackDevtoolsWrapper = dynamic(
  () => import('@/components/providers/tanstack-devtools').then(
    (mod) => mod.TanStackDevtoolsWrapper
  ),
  { ssr: false }
)

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
        <TanStackDevtoolsWrapper />
      </ThemeProvider>
    </QueryProvider>
  )
}

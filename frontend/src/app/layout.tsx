import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Pixelify_Sans } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import Header from '@/components/header'

const pixelifySans = Pixelify_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pixelify-sans',
  weight: ['400', '500', '600', '700'],
})

const stZhongsong = localFont({
  src: '../assets/fonts/chinese.stzhongs.ttf',
  display: 'swap',
  variable: '--font-stzhongsong',
})

export const metadata: Metadata = {
  title: 'LYRATHON-Gaither',
  description: 'Autonomous multi-agent recruitment system',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${pixelifySans.variable} ${stZhongsong.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

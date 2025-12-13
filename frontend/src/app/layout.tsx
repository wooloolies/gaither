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

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Gaither',
    description: 'Autonomous multi-agent recruitment system',
    keywords: ['recruitment', 'multi-agent', 'autonomous', 'AI', 'hiring'],
    authors: [{ name: 'Gaither' }],
    openGraph: {
      title: 'Gaither',
      description: 'Autonomous multi-agent recruitment system',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Gaither',
      description: 'Autonomous multi-agent recruitment system',
    },
    robots: {
      index: true,
      follow: true,
    },
  }
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

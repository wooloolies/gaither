import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Pixelify_Sans } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from '@/components/providers'
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
        <Providers>
          <div className="flex flex-col min-h-full">
            <Header />
            <div className="flex-1 flex flex-col">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}

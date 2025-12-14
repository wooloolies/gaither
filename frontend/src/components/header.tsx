'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/theme-toggle'
import BackButton from '@/components/back-button'

export default function Header(): React.JSX.Element {
  const pathname = usePathname()
  const showBackButton = pathname !== '/'
  return (
    <header className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-6 transition-colors duration-500 bg-transparent dark:bg-[#3c3c3c]">
      {/* Logo or Back Button */}
      {showBackButton ? (
        <BackButton href="/" />
      ) : (
        <div className="flex items-end gap-8">
          <h1 className="font-pixelify text-3xl md:text-4xl tracking-tight transition-colors duration-500 text-black dark:text-white">
            Gaither
          </h1>
          <nav className="hidden md:block">
            <Link
              href="/about"
              className="font-stzhongsong text-lg transition-colors duration-500 text-black hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
            >
              About Us
            </Link>
          </nav>
        </div>
      )}

      {/* Right side navigation */}
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="hidden sm:block font-stzhongsong text-lg transition-colors duration-500 text-black hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
        >
          Log in
        </Link>
        <Button
          asChild
          className="font-stzhongsong text-base px-6 py-5 rounded-[20px] transition-colors duration-500 bg-[#222] hover:bg-[#333] text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black"
        >
          <Link href="/login?mode=signup">
            Join Now
          </Link>
        </Button>
        
        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>
    </header>
  )
}

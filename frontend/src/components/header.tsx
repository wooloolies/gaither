'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/theme-toggle'

interface HeaderProps {
  isDark: boolean
  onToggleTheme: () => void
}

export default function Header({ isDark, onToggleTheme }: Readonly<HeaderProps>) {
  return (
    <header className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-6">
      {/* Logo */}
      <div className="flex items-end gap-8">
        <h1 className={`font-pixelify text-3xl md:text-4xl tracking-tight transition-colors duration-500 ${
          isDark ? 'text-white' : 'text-black'
        }`}>
          Gaither
        </h1>
        <nav className="hidden md:block">
          <Link
            href="/about"
            className={`font-stzhongsong text-lg transition-colors duration-500 ${
              isDark ? 'text-white hover:text-gray-300' : 'text-black hover:text-gray-600'
            }`}
          >
            About Us
          </Link>
        </nav>
      </div>

      {/* Right side navigation */}
      <div className="flex items-center gap-4">
        <a
          href="#login"
          className={`hidden sm:block font-stzhongsong text-lg transition-colors duration-500 ${
            isDark ? 'text-white hover:text-gray-300' : 'text-black hover:text-gray-600'
          }`}
        >
          Log in
        </a>
        <Button
          className={`font-stzhongsong text-base px-6 py-5 rounded-[20px] transition-colors duration-500 ${
            isDark 
              ? 'bg-white hover:bg-gray-100 text-black' 
              : 'bg-[#222] hover:bg-[#333] text-white'
          }`}
        >
          Join Now
        </Button>
        
        {/* Theme Toggle Button */}
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}

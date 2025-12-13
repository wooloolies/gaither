'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/theme-toggle'
import BackButton from '@/components/back-button'
import ArrowDownIcon from '@/assets/arrow-down.svg'

export default function AboutPage() {
  const [isDark, setIsDark] = useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
      isDark ? 'bg-[#3c3c3c]' : 'bg-white'
    }`}>
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-6">
        {/* Back Button */}
        <BackButton href="/" />

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
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center px-8 lg:px-12 pt-12 pb-20">
        {/* Title */}
        <h1 className={`font-pixelify text-7xl md:text-8xl lg:text-[128px] mb-16 transition-colors duration-500 ${
          isDark ? 'text-white' : 'text-black'
        }`}>
          Gaither.
        </h1>

        {/* Description */}
        <div className={`max-w-xl font-stzhongsong text-xl md:text-2xl leading-relaxed tracking-tight space-y-6 transition-colors duration-500 ${
          isDark ? 'text-gray-200' : 'text-[#333]'
        }`}>
          <p>
            Gaither is an AI-powered hiring platform that changes how tech talent and companies connect.
            {' '}We look beyond résumés and analyze practical tasks from GitHub to understand what developers actually build, the way they work and their stories.
          </p>
          <p>
            Intelligent agents helps candidates and recruiters with feasible opportunities in hours, not weeks — based on real skills, goals, and context.
          </p>
          <p>
            No spam. No inflated credentials. No wasted time.
            <br />
            Just better matches, built on real work.
          </p>
        </div>

        {/* Arrow Down Icon */}
        <div className="mt-20">
          <Image
            src={ArrowDownIcon}
            alt="Scroll down"
            width={89}
            height={90}
            className={`transition-all duration-500 ${isDark ? 'invert' : ''}`}
          />
        </div>
      </main>
    </div>
  )
}

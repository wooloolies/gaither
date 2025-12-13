'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Header from '@/components/header'
import DocumentSwirl from '@/components/document-swirl'

export default function LandingPage() {
  const [isDark, setIsDark] = useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
      isDark ? 'bg-[#3c3c3c]' : 'bg-white'
    }`}>
      {/* Header */}
      <Header isDark={isDark} onToggleTheme={toggleTheme} />

      {/* Floating Documents */}
      {/* <FloatingDocuments isDark={isDark} /> */}

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-8 lg:px-12">
        <div className="max-w-4xl mx-auto text-center md:text-left md:ml-[20%] lg:ml-[25%]">
          {/* Main headline */}
          <div className={`font-pixelify mb-8 transition-colors duration-500 ${
            isDark ? 'text-white' : 'text-black'
          }`}>
            <p className="text-2xl md:text-3xl lg:text-4xl leading-relaxed">
              No{' '}
              <span className="text-7xl md:text-8xl lg:text-[128px] font-normal leading-none">
                Inflated
              </span>{' '}
              Resumes.
            </p>
          </div>
          
          {/* Subheadline with Document Swirl */}
          <div className="flex items-center gap-10 mt-8">
            <p className={`font-serif font-bold text-3xl md:text-4xl lg:text-[40px] transition-colors duration-500 ${
              isDark ? 'text-white' : 'text-black'
            }`}>
              Just Real work.
            </p>
            <DocumentSwirl isDark={isDark} />
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-20 md:mt-28">
          <Button
            className={`font-stzhongsong text-2xl md:text-3xl px-16 md:px-20 py-8 md:py-10 rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-500 ${
              isDark 
                ? 'bg-white hover:bg-gray-100 text-black' 
                : 'bg-[#222] hover:bg-[#333] text-white'
            }`}
          >
            Hire Now
          </Button>
        </div>
      </main>
    </div>
  )
}

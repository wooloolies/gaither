'use client'

import { Button } from '@/components/ui/button'

// Floating document icons as decorative elements
function FloatingDocuments() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Document 1 - Top right */}
      <div className="absolute top-[12%] right-[8%] opacity-40 animate-float-slow">
        <svg
          width="60"
          height="72"
          viewBox="0 0 60 72"
          fill="none"
          className="rotate-[12deg]"
        >
          <rect x="4" y="4" width="52" height="64" rx="4" fill="#E5E5E5" stroke="#CCCCCC" strokeWidth="2" />
          <line x1="12" y1="20" x2="48" y2="20" stroke="#CCCCCC" strokeWidth="2" />
          <line x1="12" y1="32" x2="48" y2="32" stroke="#CCCCCC" strokeWidth="2" />
          <line x1="12" y1="44" x2="36" y2="44" stroke="#CCCCCC" strokeWidth="2" />
        </svg>
      </div>

      {/* Document 2 - Top center-left */}
      <div className="absolute top-[4%] left-[30%] opacity-60 animate-float-medium">
        <svg
          width="50"
          height="60"
          viewBox="0 0 50 60"
          fill="none"
          className="-rotate-[14deg]"
        >
          <rect x="3" y="3" width="44" height="54" rx="4" fill="#F0F0F0" stroke="#D4D4D4" strokeWidth="2" />
          <line x1="10" y1="16" x2="40" y2="16" stroke="#D4D4D4" strokeWidth="2" />
          <line x1="10" y1="26" x2="40" y2="26" stroke="#D4D4D4" strokeWidth="2" />
          <line x1="10" y1="36" x2="30" y2="36" stroke="#D4D4D4" strokeWidth="2" />
        </svg>
      </div>

      {/* Document 3 - Left side, pixel style */}
      <div className="absolute top-[18%] left-[3%] opacity-70 animate-float-fast">
        <svg
          width="54"
          height="58"
          viewBox="0 0 54 58"
          fill="none"
          className="rotate-[30deg]"
        >
          <rect x="2" y="2" width="50" height="54" rx="2" fill="#FAFAFA" stroke="#BDBDBD" strokeWidth="2" />
          <rect x="10" y="12" width="8" height="8" fill="#E0E0E0" />
          <rect x="22" y="12" width="20" height="4" fill="#E0E0E0" />
          <rect x="22" y="20" width="14" height="4" fill="#E0E0E0" />
          <rect x="10" y="32" width="32" height="4" fill="#E0E0E0" />
          <rect x="10" y="40" width="28" height="4" fill="#E0E0E0" />
        </svg>
      </div>

      {/* Large floating notebook - Right side hero area */}
      <div className="absolute top-[52%] right-[12%] opacity-80 animate-float-slow">
        <svg
          width="120"
          height="100"
          viewBox="0 0 120 100"
          fill="none"
          className="rotate-[3deg]"
        >
          <rect x="4" y="4" width="112" height="92" rx="6" fill="#FCFCFC" stroke="#C4C4C4" strokeWidth="2" />
          <line x1="20" y1="4" x2="20" y2="96" stroke="#E8E8E8" strokeWidth="1" />
          <line x1="28" y1="24" x2="104" y2="24" stroke="#D8D8D8" strokeWidth="1.5" />
          <line x1="28" y1="38" x2="104" y2="38" stroke="#D8D8D8" strokeWidth="1.5" />
          <line x1="28" y1="52" x2="104" y2="52" stroke="#D8D8D8" strokeWidth="1.5" />
          <line x1="28" y1="66" x2="80" y2="66" stroke="#D8D8D8" strokeWidth="1.5" />
          <circle cx="12" cy="20" r="3" fill="#E0E0E0" />
          <circle cx="12" cy="40" r="3" fill="#E0E0E0" />
          <circle cx="12" cy="60" r="3" fill="#E0E0E0" />
          <circle cx="12" cy="80" r="3" fill="#E0E0E0" />
        </svg>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 lg:px-12 py-6">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <h1 className="font-pixelify text-3xl md:text-4xl text-black tracking-tight">
            Gaither
          </h1>
          <nav className="hidden md:block">
            <a
              href="#about"
              className="font-stzhongsong text-lg text-black hover:text-gray-600 transition-colors"
            >
              About Us
            </a>
          </nav>
        </div>

        {/* Right side navigation */}
        <div className="flex items-center gap-4">
          <a
            href="#login"
            className="hidden sm:block font-stzhongsong text-lg text-black hover:text-gray-600 transition-colors"
          >
            Log in
          </a>
          <Button
            className="bg-[#222] hover:bg-[#333] text-white font-stzhongsong text-base px-6 py-5 rounded-[20px]"
          >
            Join Now
          </Button>
        </div>
      </header>

      {/* Floating Documents */}
      <FloatingDocuments />

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-8 lg:px-12">
        <div className="max-w-4xl mx-auto text-center md:text-left md:ml-[20%] lg:ml-[25%]">
          {/* Main headline */}
          <div className="font-pixelify text-black mb-8">
            <p className="text-2xl md:text-3xl lg:text-4xl leading-relaxed">
              No{' '}
              <span className="text-7xl md:text-8xl lg:text-[128px] font-normal leading-none">
                Inflated
              </span>{' '}
              Resumes.
            </p>
          </div>
          
          {/* Subheadline */}
          <p className="font-serif font-bold text-3xl md:text-4xl lg:text-[40px] text-black mt-8">
            Just Real work.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-20 md:mt-28">
          <Button
            className="bg-[#222] hover:bg-[#333] text-white font-stzhongsong text-2xl md:text-3xl px-16 md:px-20 py-8 md:py-10 rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Hire Now
          </Button>
        </div>
      </main>

      {/* Decorative corner element */}
      <div className="absolute top-6 right-6 w-16 h-16 md:w-20 md:h-20 opacity-30">
        <svg viewBox="0 0 80 80" fill="none">
          <path
            d="M40 0 L80 40 L40 80 L0 40 Z"
            fill="#E5E5E5"
            stroke="#CCCCCC"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  )
}


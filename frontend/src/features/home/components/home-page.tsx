'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import DocumentSwirl from '@/components/document-swirl'

export default function HomePage() {
  const router = useRouter()

  const handleHireNow = () => {
    router.push('/hire')
  }

  const handleChat = () => {
    router.push('/chat')
  }

  return (
    <div className="relative overflow-hidden transition-colors duration-500 bg-white dark:bg-[#3c3c3c]">
      {/* Subtle pixel grid background */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-8 lg:px-12 pt-36 lg:justify-start">
        <div className="max-w-4xl mx-auto text-center md:text-left">
          {/* Main headline */}
          <div className="font-pixelify mb-8 transition-colors duration-500 text-black dark:text-white">
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
            <p className="font-serif font-bold text-3xl md:text-4xl lg:text-[40px] transition-colors duration-500 text-black dark:text-white">
              Just Real work.
            </p>
            <DocumentSwirl />
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-20 md:mt-28 flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleHireNow}
            className="font-stzhongsong text-2xl md:text-3xl px-16 md:px-20 py-8 md:py-10 rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-500 bg-[#222] hover:bg-[#333] text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black cursor-pointer"
          >
            Hire Now
          </Button>
          <Button
            onClick={handleChat}
            className="font-stzhongsong text-2xl md:text-3xl px-16 md:px-20 py-8 md:py-10 rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-500 bg-white hover:bg-gray-50 text-black border border-black/20 dark:bg-black/30 dark:hover:bg-black/40 dark:text-white dark:border-white/20 cursor-pointer"
          >
            AI Talent Scout
          </Button>
        </div>
      </main>
    </div>
  )
}


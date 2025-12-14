'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import DocumentSwirl from '@/components/document-swirl'

export default function HomePage() {
  const router = useRouter()

  const handleHireNow = () => {
    router.push('/hire')
  }

  return (
    <div className="relative overflow-hidden transition-colors duration-500 bg-white dark:bg-[#3c3c3c]">

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

        {/* CTA Button */}
        <div className="mt-20 md:mt-28">
          <Button
            onClick={handleHireNow}
            className="font-stzhongsong text-2xl md:text-3xl px-16 md:px-20 py-8 md:py-10 rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-500 bg-[#222] hover:bg-[#333] text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black cursor-pointer"
          >
            Hire Now
          </Button>
        </div>
      </main>
    </div>
  )
}


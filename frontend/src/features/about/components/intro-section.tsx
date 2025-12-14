'use client'

import Image from 'next/image'
import ArrowDownIcon from '@/assets/arrow-down.svg'

interface IntroSectionProps {
  onScrollDown: () => void
}

export default function IntroSection({ onScrollDown }: Readonly<IntroSectionProps>) {
  return (
    <main className="relative z-10 flex flex-col items-center px-8 lg:px-12 pt-12 pb-20">
      {/* Title */}
      <h1 className="font-pixelify text-7xl md:text-8xl lg:text-[128px] mb-16 transition-colors duration-500 text-black dark:text-white">
        Gaither.
      </h1>

      {/* Description */}
      <div className="max-w-xl font-stzhongsong text-xl md:text-2xl leading-relaxed tracking-tight space-y-6 transition-colors duration-500 text-[#333] dark:text-gray-200">
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
      <button 
        onClick={onScrollDown}
        className="mt-20 cursor-pointer hover:scale-105 transition-transform animate-bounce-gentle"
        aria-label="Scroll to Agents section"
      >
        <Image
          src={ArrowDownIcon}
          alt="Scroll down"
          width={89}
          height={90}
          className="cursor-pointer transition-all duration-500 dark:invert"
        />
      </button>
    </main>
  )
}


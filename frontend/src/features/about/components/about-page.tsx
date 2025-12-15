'use client'

import { useRef } from 'react'
import IntroSection from '@/features/about/components/intro-section'
import AgentsSection from '@/features/about/components/agents-section'

export default function AboutPage() {
  const agentsSectionRef = useRef<HTMLElement>(null)

  const scrollToAgentsSection = () => {
    agentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
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

      <div className="relative z-10">
        <IntroSection onScrollDown={scrollToAgentsSection} />
        <AgentsSection ref={agentsSectionRef} />
      </div>
    </div>
  )
}

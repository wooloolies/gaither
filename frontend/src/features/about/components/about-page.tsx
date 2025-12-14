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
      <IntroSection onScrollDown={scrollToAgentsSection} />
      <AgentsSection ref={agentsSectionRef} />
    </div>
  )
}

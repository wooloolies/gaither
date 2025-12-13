'use client'

import { useRef, useState } from 'react'
import AboutHeader from '@/features/About/components/about-header'
import IntroSection from '@/features/About/components/intro-section'
import AgentsSection from '@/features/About/components/agents-section'

export default function AboutPage() {
  const [isDark, setIsDark] = useState(false)
  const agentsSectionRef = useRef<HTMLElement>(null)

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  const scrollToAgentsSection = () => {
    agentsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
      isDark ? 'bg-[#3c3c3c]' : 'bg-white'
    }`}>
      <AboutHeader isDark={isDark} onToggleTheme={toggleTheme} />
      <IntroSection isDark={isDark} onScrollDown={scrollToAgentsSection} />
      <AgentsSection ref={agentsSectionRef} isDark={isDark} />
    </div>
  )
}

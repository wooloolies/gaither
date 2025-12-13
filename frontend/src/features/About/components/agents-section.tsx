'use client'

import { forwardRef } from 'react'
import { motion } from 'motion/react'

const agents = [
  {
    id: 'hunter',
    title: 'Hunter Agent',
    description: 'We scan real GitHub activity to find developers whose work matches your needs.',
  },
  {
    id: 'analyzer',
    title: 'Analyzer Agent',
    description: 'We evaluate real code work to understand skill depth and engineering quality.',
  },
  {
    id: 'engager',
    title: 'Engager Agent',
    description: 'We personalized the strong matches, with context that matters.',
  },
]

interface AgentsSectionProps {}

const AgentsSection = forwardRef<HTMLElement, AgentsSectionProps>(
  function AgentsSection(_props, ref) {
    return (
      <section 
        ref={ref} 
        className="min-h-screen transition-colors duration-500 bg-white dark:bg-[#3c3c3c]"
      >
        <div className="relative px-8 lg:px-12 py-20">
          <div className="max-w-7xl mx-auto">
            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="font-pixelify text-7xl md:text-8xl lg:text-[128px] mb-16 transition-colors duration-500 text-black dark:text-white"
            >
              Agents
            </motion.h2>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
              {/* Left - Description */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="font-stzhongsong text-lg md:text-xl lg:text-2xl leading-relaxed tracking-tight transition-colors duration-500 text-black dark:text-gray-200"
              >
                <p className="mb-6">
                  Gaither shortens recruiting time by breaking the hiring process into three focused stages, each handled by a dedicated AI agent.
                </p>
                <p>
                  Instead of relying on résumés, keyword searches, or mass outreach, each agent works on a single problem — finding the right people, understanding their real work, and reaching out with relevance and context.
                </p>
              </motion.div>

              {/* Right - Agent Cards */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="flex flex-col gap-8"
              >
                {/* Agent Cards Row */}
                <div className="flex flex-wrap items-start gap-4 justify-center lg:justify-start">
                  {agents.map((agent, index) => (
                    <div key={agent.id} className="flex items-center gap-2">
                      {/* Agent Card */}
                      <div className="bg-[#ffd277] rounded-[20px] px-6 py-4 min-w-[140px] text-center">
                        <p className="font-pixelify text-lg md:text-xl text-black leading-tight">
                          {agent.title.split(' ').map((word, wordIndex) => (
                            <span key={`${agent.id}-${word}`} className={wordIndex === 1 ? 'block' : ''}>
                              {word}{wordIndex === 0 ? ' ' : ''}
                            </span>
                          ))}
                        </p>
                      </div>
                      
                      {/* Arrow between cards */}
                      {index < agents.length - 1 && (
                        <div className="flex gap-1">
                          <span className="font-pixelify text-2xl transition-colors duration-500 text-black dark:text-white">&gt;&gt;</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Agent Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {agents.map((agent) => (
                    <div 
                      key={`desc-${agent.id}`} 
                      className="font-stzhongsong text-sm md:text-base leading-relaxed transition-colors duration-500 text-black dark:text-gray-300"
                    >
                      {agent.description}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    )
  }
)

export default AgentsSection


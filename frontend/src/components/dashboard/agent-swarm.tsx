'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import AgentCharacter from './agent-character'
import type { AgentStates, WebSocketEvent } from '@/store/agent-store'

interface AgentSwarmProps {
  agentStates: AgentStates
  events: WebSocketEvent[]
}

// Connection lines between agents (simplified)
function ConnectionLines({ agentStates }: { agentStates: AgentStates }) {
  const hunterActive = agentStates.hunter === 'active'
  const analyzerActive = agentStates.analyzer === 'active'

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* Hunter to Analyzer arc */}
      <motion.path
        d="M 20 40 Q 50 25, 80 40"
        fill="none"
        strokeWidth="0.8"
        strokeDasharray="2 2"
        className={hunterActive || analyzerActive ? 'stroke-emerald-400/40' : 'stroke-border/20'}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
      />
      {/* Analyzer to Engager arc */}
      <motion.path
        d="M 80 40 Q 75 60, 50 70"
        fill="none"
        strokeWidth="0.8"
        strokeDasharray="2 2"
        className={analyzerActive ? 'stroke-blue-400/40' : 'stroke-border/20'}
      />
      {/* Hunter to Engager arc */}
      <motion.path
        d="M 20 40 Q 25 60, 50 70"
        fill="none"
        strokeWidth="0.8"
        strokeDasharray="2 2"
        className="stroke-border/15"
      />
    </svg>
  )
}

export default function AgentSwarm({ agentStates, events }: AgentSwarmProps) {
  const [agentMessages, setAgentMessages] = useState<{
    hunter?: string
    analyzer?: string
    engager?: string
  }>({})

  // Extract latest messages for each agent from events
  useEffect(() => {
    if (events.length === 0) return

    const latestEvent = events[0]
    const message = latestEvent.data?.message || latestEvent.event.replace(/_/g, ' ')

    if (latestEvent.event.includes('hunter')) {
      setAgentMessages((prev) => ({ ...prev, hunter: message }))
      const timer = setTimeout(() => setAgentMessages((prev) => ({ ...prev, hunter: undefined })), 4000)
      return () => clearTimeout(timer)
    } else if (latestEvent.event.includes('analyzer')) {
      setAgentMessages((prev) => ({ ...prev, analyzer: message }))
      const timer = setTimeout(() => setAgentMessages((prev) => ({ ...prev, analyzer: undefined })), 4000)
      return () => clearTimeout(timer)
    } else if (latestEvent.event.includes('engager')) {
      setAgentMessages((prev) => ({ ...prev, engager: message }))
      const timer = setTimeout(() => setAgentMessages((prev) => ({ ...prev, engager: undefined })), 4000)
      return () => clearTimeout(timer)
    }
  }, [events])

  // Overall swarm status
  const isAnyActive = agentStates.hunter === 'active' || agentStates.analyzer === 'active' || agentStates.engager === 'active'
  const isAllCompleted = agentStates.hunter === 'completed' && agentStates.analyzer === 'completed' && agentStates.engager === 'completed'

  return (
    <div className="relative w-full">
      {/* Status header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">Agent Swarm</h3>
        <motion.div
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            isAllCompleted
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : isAnyActive
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
              : 'bg-muted border-border text-muted-foreground'
          }`}
          animate={isAnyActive ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {isAllCompleted ? '✓ Done' : isAnyActive ? '● Working' : '○ Ready'}
        </motion.div>
      </div>

      {/* Agent workspace visualization */}
      <div className="relative h-[200px] bg-gradient-to-br from-surface/30 to-transparent rounded-xl border border-border/50 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '12px 12px',
            }}
          />
        </div>

        {/* Connection lines */}
        <ConnectionLines agentStates={agentStates} />

        {/* Agents in triangle formation - positioned with room for bubbles */}
        {/* Hunter - Top Left */}
        <div className="absolute left-4 top-10">
          <AgentCharacter
            type="hunter"
            status={agentStates.hunter}
            message={agentMessages.hunter}
            size="xs"
          />
        </div>

        {/* Analyzer - Top Right */}
        <div className="absolute right-4 top-10">
          <AgentCharacter
            type="analyzer"
            status={agentStates.analyzer}
            message={agentMessages.analyzer}
            size="xs"
          />
        </div>

        {/* Engager - Bottom Center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <AgentCharacter
            type="engager"
            status={agentStates.engager}
            message={agentMessages.engager}
            size="xs"
          />
        </div>

        {/* Central pulse when active */}
        {isAnyActive && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-accent-blue/50"
              animate={{ scale: [1, 2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}

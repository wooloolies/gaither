"use client"

import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { AgentStates, WebSocketEvent } from '@/store/agent-store'

const AGENT_CONFIG = {
  hunter: {
    name: 'HUNTER',
    icon: '🎯',
    color: 'text-emerald-500',
    dotBg: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/20',
  },
  analyzer: {
    name: 'ANALYZER',
    icon: '🧠',
    color: 'text-accent-blue',
    dotBg: 'bg-accent-blue',
    badgeBg: 'bg-accent-blue/10',
    badgeBorder: 'border-accent-blue/20',
  },
  engager: {
    name: 'ENGAGER',
    icon: '💬',
    color: 'text-accent-purple',
    dotBg: 'bg-accent-purple',
    badgeBg: 'bg-accent-purple/10',
    badgeBorder: 'border-accent-purple/20',
  },
} as const

interface AgentStatusProps {
  agentStates: AgentStates
  events: WebSocketEvent[]
}

export default function AgentStatus({ agentStates, events }: AgentStatusProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll terminal
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events])

  return (
    <div className="flex flex-col h-full">
      {/* Agent Status Rows */}
      <div className="p-6 border-b border-border space-y-4 bg-surface/10">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Agent Swarm Status</h3>

        {Object.entries(AGENT_CONFIG).map(([key, config]) => {
          const state = agentStates[key as keyof AgentStates]
          const isActive = state === 'active'

          return (
            <div key={key} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isActive ? `animate-pulse ${config.dotBg}` : 'bg-border'}`} />
                <span className={`font-mono text-sm ${isActive ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                  {config.name}
                </span>
              </div>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-xs ${config.color} ${config.badgeBg} px-2 py-0.5 rounded border ${config.badgeBorder}`}
                >
                  RUNNING
                </motion.span>
              )}
              {state === 'completed' && <span className="text-xs text-state-success">DONE</span>}
            </div>
          )
        })}
      </div>

      {/* Terminal Output */}
      <div className="flex-1 flex flex-col min-h-0 bg-surface/40">
        <div className="p-3 border-b border-border/50 sticky top-0 bg-panel/95 backdrop-blur z-10">
          <h3 className="text-xs font-mono text-muted-foreground">SYSTEM LOGS</h3>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
          <AnimatePresence initial={false}>
            {events.length === 0 ? (
              <div className="text-muted-foreground/70 italic text-center mt-10">System ready. Waiting for initialization...</div>
            ) : (
              events.map((event, i) => (
                <motion.div
                  key={event.timestamp ? String(event.timestamp) : i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3"
                >
                  <span className="text-muted-foreground/60 text-[10px] w-14 shrink-0">
                    {event.timestamp
                      ? new Date(event.timestamp).toLocaleTimeString([], {
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '--:--:--'}
                  </span>
                  <span
                    className={
                      event.event.includes('hunter')
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : event.event.includes('analyzer')
                          ? 'text-blue-500 dark:text-blue-400'
                          : event.event.includes('engager')
                            ? 'text-purple-500 dark:text-purple-400'
                            : 'text-muted-foreground'
                    }
                  >
                    {`>`} {event.data?.message || event.event.replace(/_/g, ' ')}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}


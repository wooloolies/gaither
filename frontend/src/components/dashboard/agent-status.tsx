"use client"

import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { AgentStates, WebSocketEvent } from '@/store/agent-store'
import AgentSwarm from './agent-swarm'

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
      {/* Agent Swarm Visualization */}
      <div className="p-4 border-b border-border">
        <AgentSwarm agentStates={agentStates} events={events} />
      </div>

      {/* Activity Log */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-border sticky top-0 bg-white/95 dark:bg-panel/95 backdrop-blur z-10">
          <h3 className="text-sm font-semibold text-foreground">Activity Log</h3>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence initial={false}>
            {events.length === 0 ? (
              <div className="text-muted-foreground text-sm text-center mt-10">Waiting for agents to start...</div>
            ) : (
              events.map((event, i) => (
                <motion.div
                  key={event.timestamp ? String(event.timestamp) : i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3 p-2 rounded-lg hover:bg-surface/30 transition-colors"
                >
                  <span className="text-muted-foreground text-[10px] w-12 shrink-0 mt-0.5">
                    {event.timestamp
                      ? new Date(event.timestamp).toLocaleTimeString([], {
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '--:--:--'}
                  </span>
                  <div className="flex-1">
                    <span
                      className={
                        event.event.includes('hunter')
                          ? 'text-emerald-600 dark:text-emerald-500 text-xs font-medium'
                          : event.event.includes('analyzer')
                            ? 'text-blue-600 dark:text-blue-500 text-xs font-medium'
                            : event.event.includes('engager')
                              ? 'text-purple-600 dark:text-purple-500 text-xs font-medium'
                              : 'text-muted-foreground text-xs'
                      }
                    >
                      {event.data?.message || event.event.replace(/_/g, ' ')}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}


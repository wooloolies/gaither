import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'

const AGENT_CONFIG = {
  hunter: { name: 'HUNTER', icon: '🎯', color: 'text-emerald-500', bg: 'bg-emerald-500' },
  analyzer: { name: 'ANALYZER', icon: '🧠', color: 'text-accent-blue', bg: 'bg-accent-blue' },
  engager: { name: 'ENGAGER', icon: '💬', color: 'text-accent-purple', bg: 'bg-accent-purple' }
}

export default function AgentStatus({ agentStates, events }) {
  const scrollRef = useRef(null)

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
        <h3 className="text-xs font-mono text-secondary uppercase tracking-widest mb-4">Agent Swarm Status</h3>

        {Object.entries(AGENT_CONFIG).map(([key, config]) => {
          const state = agentStates[key]
          const isActive = state === 'active'

          return (
            <div key={key} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isActive ? 'animate-pulse ' + config.bg : 'bg-gray-700'}`} />
                <span className={`font-mono text-sm ${isActive ? 'text-white font-bold' : 'text-secondary'}`}>{config.name}</span>
              </div>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-xs ${config.color} bg-${config.color}/10 px-2 py-0.5 rounded border border-${config.color}/20`}
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
      <div className="flex-1 flex flex-col min-h-0 bg-black/40">
        <div className="p-3 border-b border-border/50 sticky top-0 bg-panel/95 backdrop-blur z-10">
          <h3 className="text-xs font-mono text-secondary">SYSTEM LOGS</h3>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
          <AnimatePresence initial={false}>
            {events.length === 0 ? (
              <div className="text-gray-700 italic text-center mt-10">System ready. Waiting for initialization...</div>
            ) : (
              events.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3"
                >
                  <span className="text-gray-600 text-[10px] w-14 shrink-0">{new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span className={
                    event.event.includes('hunter') ? 'text-emerald-400' :
                      event.event.includes('analyzer') ? 'text-blue-400' :
                        event.event.includes('engager') ? 'text-purple-400' : 'text-gray-400'
                  }>
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

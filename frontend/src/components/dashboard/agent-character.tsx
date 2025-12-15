'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { AgentStatus } from '@/store/agent-store'

interface AgentCharacterProps {
  type: 'hunter' | 'analyzer' | 'engager'
  status: AgentStatus
  message?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CONFIG = {
  xs: { container: 'w-10 h-10', checkmark: 'w-4 h-4', checkIcon: 'w-2.5 h-2.5', text: 'text-[10px]', statusText: 'text-[8px]' },
  sm: { container: 'w-14 h-14', checkmark: 'w-5 h-5', checkIcon: 'w-3 h-3', text: 'text-xs', statusText: 'text-[10px]' },
  md: { container: 'w-16 h-16', checkmark: 'w-6 h-6', checkIcon: 'w-4 h-4', text: 'text-xs', statusText: 'text-[10px]' },
  lg: { container: 'w-20 h-20', checkmark: 'w-8 h-8', checkIcon: 'w-5 h-5', text: 'text-sm', statusText: 'text-xs' },
}

// Hunter Agent - Scout with binoculars
function HunterCharacter({ isActive }: { isActive: boolean }) {
  const [lookDirection, setLookDirection] = useState(0)

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setLookDirection((prev) => (prev + 1) % 3)
    }, 800)
    return () => clearInterval(interval)
  }, [isActive])

  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Hat */}
      <rect x="16" y="8" width="32" height="6" className="fill-emerald-600" />
      <rect x="12" y="14" width="40" height="4" className="fill-emerald-700" />
      
      {/* Head */}
      <rect x="18" y="18" width="28" height="22" className="fill-amber-200" />
      
      {/* Eyes with binoculars */}
      <motion.g
        animate={{ x: isActive ? (lookDirection - 1) * 2 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <rect x="14" y="24" width="36" height="10" className="fill-gray-800" />
        <rect x="16" y="26" width="10" height="6" className="fill-emerald-400" />
        <rect x="38" y="26" width="10" height="6" className="fill-emerald-400" />
        <rect x="26" y="27" width="12" height="4" className="fill-gray-700" />
        <rect x="17" y="27" width="2" height="2" className="fill-white opacity-60" />
        <rect x="39" y="27" width="2" height="2" className="fill-white opacity-60" />
      </motion.g>
      
      {/* Mouth */}
      <rect x="28" y="36" width="8" height="2" className={isActive ? 'fill-amber-800' : 'fill-amber-600'} />
      
      {/* Body */}
      <rect x="16" y="42" width="32" height="18" className="fill-emerald-500" />
      <rect x="20" y="42" width="24" height="18" className="fill-emerald-600" />
      <rect x="22" y="48" width="8" height="6" className="fill-emerald-700" />
      <rect x="34" y="48" width="8" height="6" className="fill-emerald-700" />
      
      {/* Arms */}
      <rect x="8" y="44" width="8" height="14" className="fill-amber-200" />
      <rect x="48" y="44" width="8" height="14" className="fill-amber-200" />
    </svg>
  )
}

// Analyzer Agent - Scientist with glasses
function AnalyzerCharacter({ isActive }: { isActive: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Hair */}
      <rect x="18" y="8" width="28" height="8" className="fill-blue-900" />
      <rect x="16" y="12" width="4" height="8" className="fill-blue-900" />
      <rect x="44" y="12" width="4" height="8" className="fill-blue-900" />
      
      {/* Head */}
      <rect x="18" y="14" width="28" height="24" className="fill-amber-100" />
      
      {/* Glasses */}
      <rect x="14" y="22" width="36" height="2" className="fill-gray-700" />
      <rect x="16" y="20" width="12" height="10" className="fill-gray-700" />
      <rect x="36" y="20" width="12" height="10" className="fill-gray-700" />
      <rect x="18" y="22" width="8" height="6" className="fill-blue-200" />
      <rect x="38" y="22" width="8" height="6" className="fill-blue-200" />
      
      {/* Eyes */}
      <motion.g animate={{ scaleY: isActive ? [1, 0.2, 1] : 1 }} transition={{ duration: 0.2, repeat: isActive ? Infinity : 0, repeatDelay: 2 }}>
        <rect x="20" y="24" width="4" height="3" className="fill-gray-800" />
        <rect x="40" y="24" width="4" height="3" className="fill-gray-800" />
      </motion.g>
      
      {/* Mouth */}
      <rect x="28" y="34" width="8" height="2" className="fill-amber-700" />
      
      {/* Body - Lab coat */}
      <rect x="14" y="40" width="36" height="20" className="fill-white" />
      <rect x="28" y="40" width="8" height="20" className="fill-blue-100" />
      <rect x="30" y="46" width="4" height="2" className="fill-blue-300" />
      <rect x="30" y="52" width="4" height="2" className="fill-blue-300" />
      
      {/* Arms */}
      <rect x="6" y="42" width="8" height="16" className="fill-white" />
      <rect x="50" y="42" width="8" height="16" className="fill-white" />
    </svg>
  )
}

// Engager Agent - Friendly messenger
function EngagerCharacter({ isActive }: { isActive: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Hair */}
      <rect x="18" y="6" width="28" height="4" className="fill-purple-800" />
      <rect x="20" y="4" width="4" height="4" className="fill-purple-800" />
      <rect x="28" y="2" width="4" height="6" className="fill-purple-800" />
      <rect x="36" y="4" width="4" height="4" className="fill-purple-800" />
      <rect x="16" y="10" width="32" height="6" className="fill-purple-800" />
      
      {/* Head */}
      <rect x="18" y="14" width="28" height="22" className="fill-amber-200" />
      
      {/* Eyes */}
      <motion.g animate={isActive ? { y: [0, -1, 0] } : {}} transition={{ duration: 0.5, repeat: Infinity }}>
        <rect x="22" y="22" width="6" height="6" className="fill-gray-800" />
        <rect x="36" y="22" width="6" height="6" className="fill-gray-800" />
        <rect x="24" y="23" width="2" height="2" className="fill-white" />
        <rect x="38" y="23" width="2" height="2" className="fill-white" />
      </motion.g>
      
      {/* Smile */}
      <path d="M 26 32 Q 32 38, 38 32" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-800" />
      
      {/* Body - Hoodie */}
      <rect x="14" y="38" width="36" height="22" className="fill-purple-500" />
      <rect x="22" y="48" width="20" height="10" className="fill-purple-600" />
      <rect x="26" y="38" width="2" height="8" className="fill-white" />
      <rect x="36" y="38" width="2" height="8" className="fill-white" />
      
      {/* Arms */}
      <rect x="6" y="40" width="8" height="16" className="fill-purple-500" />
      <motion.g
        animate={isActive ? { rotate: [-10, 20, -10] } : { rotate: 0 }}
        transition={{ duration: 0.6, repeat: Infinity }}
        style={{ transformOrigin: '54px 42px' }}
      >
        <rect x="50" y="40" width="8" height="16" className="fill-purple-500" />
        <rect x="52" y="54" width="6" height="6" className="fill-amber-200" />
      </motion.g>
    </svg>
  )
}

const AGENT_CONFIG = {
  hunter: {
    name: 'Hunter',
    role: 'Finding...',
    bgGradient: 'from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-500/30',
    glowColor: 'shadow-emerald-500/30',
    bubbleColor: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700',
    Character: HunterCharacter,
  },
  analyzer: {
    name: 'Analyzer',
    role: 'Analyzing...',
    bgGradient: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    glowColor: 'shadow-blue-500/30',
    bubbleColor: 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700',
    Character: AnalyzerCharacter,
  },
  engager: {
    name: 'Engager',
    role: 'Crafting...',
    bgGradient: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    glowColor: 'shadow-purple-500/30',
    bubbleColor: 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700',
    Character: EngagerCharacter,
  },
} as const

export default function AgentCharacter({ type, status, message, size = 'md', className = '' }: AgentCharacterProps) {
  const config = AGENT_CONFIG[type]
  const sizeConfig = SIZE_CONFIG[size]
  const isActive = status === 'active'
  const isCompleted = status === 'completed'

  const statusText = useMemo(() => {
    if (isCompleted) return 'Done!'
    if (isActive) return config.role
    return 'Ready'
  }, [isCompleted, isActive, config.role])

  return (
    <motion.div
      className={`relative flex flex-col items-center ${className}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Speech bubble for messages - appears next to agent */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute top-0 ${type === 'engager' ? '-top-6' : 'top-0'} ${
              type === 'hunter' ? 'left-full ml-1' : type === 'analyzer' ? 'right-full mr-1' : 'left-1/2 -translate-x-1/2'
            } px-1.5 py-0.5 rounded border ${config.bubbleColor} shadow-sm z-20 max-w-[100px]`}
          >
            <p className="text-[8px] text-foreground truncate leading-tight">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character container */}
      <motion.div
        className={`relative ${sizeConfig.container} rounded-xl bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} overflow-hidden ${
          isActive ? `shadow-md ${config.glowColor}` : ''
        } ${isCompleted ? 'opacity-70' : ''}`}
        animate={isActive ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <config.Character isActive={isActive} />
        
        {/* Completed checkmark overlay */}
        {isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <div className={`${sizeConfig.checkmark} rounded-full bg-emerald-500 flex items-center justify-center`}>
              <svg className={`${sizeConfig.checkIcon} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </motion.div>
        )}

        {/* Active indicator dot */}
        {isActive && (
          <motion.div
            className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
              type === 'hunter' ? 'bg-emerald-500' : type === 'analyzer' ? 'bg-blue-500' : 'bg-purple-500'
            }`}
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Agent name and status */}
      <div className="mt-1.5 text-center">
        <p className={`${sizeConfig.text} font-semibold ${
          isActive 
            ? type === 'hunter' 
              ? 'text-emerald-600 dark:text-emerald-400'
              : type === 'analyzer'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-purple-600 dark:text-purple-400'
            : 'text-foreground'
        }`}>
          {config.name}
        </p>
        <p className={`${sizeConfig.statusText} text-muted-foreground`}>
          {statusText}
        </p>
      </div>
    </motion.div>
  )
}

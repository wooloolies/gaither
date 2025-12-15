'use client'

import { useEffect, useState } from 'react'

type AgentState = 'idle' | 'thinking' | 'speaking'

interface AgentAvatarProps {
  state?: AgentState
  size?: number
  className?: string
}

export function AgentAvatar({ state = 'idle', size = 48, className = '' }: AgentAvatarProps) {
  const [blinkOpen, setBlinkOpen] = useState(true)
  const [mouthOpen, setMouthOpen] = useState(false)

  // Blinking animation
  useEffect(() => {
    if (state === 'thinking') return // No blinking while thinking

    const blinkInterval = setInterval(() => {
      setBlinkOpen(false)
      setTimeout(() => setBlinkOpen(true), 150)
    }, 3000 + Math.random() * 2000)

    return () => clearInterval(blinkInterval)
  }, [state])

  // Speaking animation
  useEffect(() => {
    if (state !== 'speaking') {
      setMouthOpen(false)
      return
    }

    const mouthInterval = setInterval(() => {
      setMouthOpen((prev) => !prev)
    }, 200)

    return () => clearInterval(mouthInterval)
  }, [state])

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Character container with bounce animation when thinking */}
      <div
        className={`w-full h-full ${state === 'thinking' ? 'animate-bounce' : ''}`}
        style={{ animationDuration: state === 'thinking' ? '1s' : undefined }}
      >
        <svg
          viewBox="0 0 32 32"
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        >
          {/* Background circle */}
          <rect
            x="4"
            y="4"
            width="24"
            height="24"
            rx="4"
            className="fill-black/5 dark:fill-white/10 stroke-black/20 dark:stroke-white/20"
            strokeWidth="1"
          />

          {/* Robot head */}
          <rect x="9" y="8" width="14" height="12" className="fill-[#4a9eff] dark:fill-[#6bb3ff]" />
          
          {/* Antenna */}
          <rect x="15" y="5" width="2" height="4" className="fill-[#4a9eff] dark:fill-[#6bb3ff]" />
          <rect x="14" y="4" width="4" height="2" className="fill-[#ff6b6b] dark:fill-[#ff8585]" />

          {/* Face plate */}
          <rect x="11" y="10" width="10" height="8" className="fill-[#1a1a2e] dark:fill-[#2a2a4e]" />

          {/* Eyes */}
          {blinkOpen ? (
            <>
              {/* Left eye */}
              <rect
                x="12"
                y="12"
                width="3"
                height="3"
                className={`transition-all duration-100 ${
                  state === 'thinking'
                    ? 'fill-yellow-400 dark:fill-yellow-300'
                    : 'fill-[#4ade80] dark:fill-[#6ee7a0]'
                }`}
              />
              {/* Left eye highlight */}
              <rect x="12" y="12" width="1" height="1" className="fill-white/60" />
              
              {/* Right eye */}
              <rect
                x="17"
                y="12"
                width="3"
                height="3"
                className={`transition-all duration-100 ${
                  state === 'thinking'
                    ? 'fill-yellow-400 dark:fill-yellow-300'
                    : 'fill-[#4ade80] dark:fill-[#6ee7a0]'
                }`}
              />
              {/* Right eye highlight */}
              <rect x="17" y="12" width="1" height="1" className="fill-white/60" />
            </>
          ) : (
            <>
              {/* Closed eyes (line) */}
              <rect x="12" y="13" width="3" height="1" className="fill-[#4ade80] dark:fill-[#6ee7a0]" />
              <rect x="17" y="13" width="3" height="1" className="fill-[#4ade80] dark:fill-[#6ee7a0]" />
            </>
          )}

          {/* Mouth */}
          {mouthOpen ? (
            <rect x="14" y="16" width="4" height="2" className="fill-[#ff6b6b] dark:fill-[#ff8585]" />
          ) : (
            <rect x="14" y="16" width="4" height="1" className="fill-[#4ade80]/60 dark:fill-[#6ee7a0]/60" />
          )}

          {/* Body hint */}
          <rect x="11" y="20" width="10" height="4" className="fill-[#4a9eff] dark:fill-[#6bb3ff]" />
          
          {/* Chest light */}
          <rect
            x="15"
            y="21"
            width="2"
            height="2"
            className={`transition-all duration-300 ${
              state === 'thinking'
                ? 'fill-yellow-400 dark:fill-yellow-300 animate-pulse'
                : state === 'speaking'
                ? 'fill-[#4ade80] dark:fill-[#6ee7a0] animate-pulse'
                : 'fill-[#4ade80]/50 dark:fill-[#6ee7a0]/50'
            }`}
          />

          {/* Ear pieces */}
          <rect x="7" y="12" width="2" height="4" className="fill-[#4a9eff] dark:fill-[#6bb3ff]" />
          <rect x="23" y="12" width="2" height="4" className="fill-[#4a9eff] dark:fill-[#6bb3ff]" />
        </svg>
      </div>

      {/* Status indicator */}
      <div
        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#3c3c3c] transition-colors duration-300 ${
          state === 'thinking'
            ? 'bg-yellow-400 animate-pulse'
            : state === 'speaking'
            ? 'bg-green-400 animate-pulse'
            : 'bg-green-500'
        }`}
      />
    </div>
  )
}

// User avatar with pixel art style
export function UserAvatar({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 32 32"
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Background */}
        <rect
          x="4"
          y="4"
          width="24"
          height="24"
          rx="4"
          className="fill-black/5 dark:fill-white/10 stroke-black/20 dark:stroke-white/20"
          strokeWidth="1"
        />

        {/* Hair */}
        <rect x="10" y="7" width="12" height="4" className="fill-[#8b5a2b] dark:fill-[#a67c52]" />
        <rect x="9" y="9" width="2" height="3" className="fill-[#8b5a2b] dark:fill-[#a67c52]" />
        <rect x="21" y="9" width="2" height="3" className="fill-[#8b5a2b] dark:fill-[#a67c52]" />

        {/* Face */}
        <rect x="10" y="10" width="12" height="10" className="fill-[#ffd5b8] dark:fill-[#e8c4a8]" />

        {/* Eyes */}
        <rect x="12" y="13" width="2" height="2" className="fill-[#1a1a2e]" />
        <rect x="18" y="13" width="2" height="2" className="fill-[#1a1a2e]" />
        
        {/* Eye highlights */}
        <rect x="12" y="13" width="1" height="1" className="fill-white/40" />
        <rect x="18" y="13" width="1" height="1" className="fill-white/40" />

        {/* Smile */}
        <rect x="14" y="17" width="4" height="1" className="fill-[#d4a69a]" />

        {/* Body/Shirt */}
        <rect x="10" y="20" width="12" height="5" className="fill-[#6366f1] dark:fill-[#818cf8]" />
        
        {/* Collar */}
        <rect x="14" y="20" width="4" height="2" className="fill-white/80 dark:fill-white/60" />
      </svg>
    </div>
  )
}

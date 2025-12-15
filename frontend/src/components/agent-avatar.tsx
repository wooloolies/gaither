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
  const [mouthFrame, setMouthFrame] = useState(0)

  // Blinking animation
  useEffect(() => {
    if (state === 'thinking') return

    const blinkInterval = setInterval(() => {
      setBlinkOpen(false)
      setTimeout(() => setBlinkOpen(true), 150)
    }, 3000 + Math.random() * 2000)

    return () => clearInterval(blinkInterval)
  }, [state])

  // Speaking/thinking animation
  useEffect(() => {
    if (state === 'idle') {
      setMouthFrame(0)
      return
    }

    const mouthInterval = setInterval(() => {
      setMouthFrame((prev) => (prev + 1) % 3)
    }, state === 'thinking' ? 400 : 150)

    return () => clearInterval(mouthInterval)
  }, [state])

  return (
    <div
      className={`relative flex-shrink-0 border-2 border-black dark:border-white bg-white dark:bg-[#3c3c3c] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-colors duration-500 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Character */}
      <div
        className={`w-full h-full ${state === 'thinking' ? 'animate-pulse' : ''}`}
      >
        <svg
          viewBox="0 0 32 32"
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        >
          {/* Robot head outline */}
          <rect x="6" y="6" width="20" height="16" className="fill-black dark:fill-white" />
          <rect x="7" y="7" width="18" height="14" className="fill-white dark:fill-[#3c3c3c]" />
          
          {/* Antenna */}
          <rect x="15" y="2" width="2" height="5" className="fill-black dark:fill-white" />
          <rect x="14" y="1" width="4" height="2" className="fill-black dark:fill-white" />

          {/* Face screen */}
          <rect x="9" y="9" width="14" height="9" className="fill-black dark:fill-white" />
          <rect x="10" y="10" width="12" height="7" className="fill-white dark:fill-[#3c3c3c]" />

          {/* Eyes */}
          {blinkOpen ? (
            <>
              {/* Left eye */}
              <rect
                x="11"
                y="11"
                width="4"
                height="4"
                className={`transition-colors duration-200 ${
                  state === 'thinking'
                    ? 'fill-black/40 dark:fill-white/40'
                    : 'fill-black dark:fill-white'
                }`}
              />
              {/* Left eye inner */}
              <rect x="13" y="11" width="2" height="2" className="fill-white dark:fill-[#3c3c3c]" />
              
              {/* Right eye */}
              <rect
                x="17"
                y="11"
                width="4"
                height="4"
                className={`transition-colors duration-200 ${
                  state === 'thinking'
                    ? 'fill-black/40 dark:fill-white/40'
                    : 'fill-black dark:fill-white'
                }`}
              />
              {/* Right eye inner */}
              <rect x="19" y="11" width="2" height="2" className="fill-white dark:fill-[#3c3c3c]" />
            </>
          ) : (
            <>
              {/* Closed eyes */}
              <rect x="11" y="13" width="4" height="1" className="fill-black dark:fill-white" />
              <rect x="17" y="13" width="4" height="1" className="fill-black dark:fill-white" />
            </>
          )}

          {/* Mouth - animated */}
          {state === 'thinking' ? (
            // Thinking dots
            <>
              <rect x={12 + mouthFrame} y="16" width="2" height="1" className="fill-black dark:fill-white" />
            </>
          ) : state === 'speaking' ? (
            // Speaking animation
            mouthFrame === 0 ? (
              <rect x="13" y="16" width="6" height="1" className="fill-black dark:fill-white" />
            ) : mouthFrame === 1 ? (
              <rect x="14" y="15" width="4" height="2" className="fill-black dark:fill-white" />
            ) : (
              <rect x="13" y="16" width="6" height="1" className="fill-black dark:fill-white" />
            )
          ) : (
            // Idle - simple line
            <rect x="13" y="16" width="6" height="1" className="fill-black dark:fill-white" />
          )}

          {/* Body */}
          <rect x="8" y="22" width="16" height="8" className="fill-black dark:fill-white" />
          <rect x="9" y="23" width="14" height="6" className="fill-white dark:fill-[#3c3c3c]" />
          
          {/* Chest indicator */}
          <rect
            x="14"
            y="24"
            width="4"
            height="4"
            className={`transition-colors duration-300 ${
              state === 'thinking'
                ? 'fill-black/30 dark:fill-white/30 animate-pulse'
                : state === 'speaking'
                ? 'fill-black dark:fill-white animate-pulse'
                : 'fill-black/20 dark:fill-white/20'
            }`}
          />

          {/* Side panels */}
          <rect x="4" y="10" width="2" height="8" className="fill-black dark:fill-white" />
          <rect x="26" y="10" width="2" height="8" className="fill-black dark:fill-white" />
        </svg>
      </div>

      {/* Status dot */}
      <div
        className={`absolute -bottom-1 -right-1 w-3 h-3 border border-black dark:border-white transition-all duration-300 ${
          state === 'thinking'
            ? 'bg-black/50 dark:bg-white/50 animate-pulse'
            : 'bg-black dark:bg-white'
        }`}
      />
    </div>
  )
}

// User avatar - minimalist pixel person
export function UserAvatar({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative flex-shrink-0 border-2 border-black dark:border-white bg-white dark:bg-[#3c3c3c] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-colors duration-500 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 32 32"
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Hair */}
        <rect x="10" y="5" width="12" height="5" className="fill-black dark:fill-white" />
        <rect x="8" y="8" width="4" height="4" className="fill-black dark:fill-white" />
        <rect x="20" y="8" width="4" height="4" className="fill-black dark:fill-white" />

        {/* Face outline */}
        <rect x="9" y="9" width="14" height="12" className="fill-black dark:fill-white" />
        <rect x="10" y="10" width="12" height="10" className="fill-white dark:fill-[#3c3c3c]" />

        {/* Eyes */}
        <rect x="12" y="13" width="2" height="3" className="fill-black dark:fill-white" />
        <rect x="18" y="13" width="2" height="3" className="fill-black dark:fill-white" />

        {/* Mouth */}
        <rect x="14" y="17" width="4" height="1" className="fill-black dark:fill-white" />

        {/* Neck */}
        <rect x="14" y="21" width="4" height="2" className="fill-black/20 dark:fill-white/20" />

        {/* Body/Shoulders */}
        <rect x="6" y="23" width="20" height="8" className="fill-black dark:fill-white" />
        <rect x="7" y="24" width="18" height="6" className="fill-white dark:fill-[#3c3c3c]" />
        
        {/* Collar detail */}
        <rect x="14" y="24" width="4" height="3" className="fill-black/30 dark:fill-white/30" />
      </svg>
    </div>
  )
}

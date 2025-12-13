'use client'

import SwitchIcon from '@/assets/switch.svg'
import Image from 'next/image'

interface ThemeToggleProps {
  isDark: boolean
  onToggle: () => void
}

export default function ThemeToggle({ isDark, onToggle }: Readonly<ThemeToggleProps>) {
  return (
    <button
      onClick={onToggle}
      className="w-10 h-10 md:w-12 md:h-11 flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer"
      aria-label="Toggle theme"
    >
      <Image
        src={SwitchIcon}
        alt="Toggle theme"
        width={48}
        height={44}
        className={`w-full h-full transition-all duration-300 ${
          isDark ? 'invert' : ''
        }`}
      />
    </button>
  )
}

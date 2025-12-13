'use client'

import SwitchIcon from '@/assets/switch.svg'
import Image from 'next/image'
import { useTheme } from 'next-themes'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 md:w-12 md:h-11 flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer"
      aria-label="Toggle theme"
    >
      <Image
        src={SwitchIcon}
        alt="Toggle theme"
        width={48}
        height={44}
        className="w-full h-full transition-all duration-300 dark:invert"
      />
    </button>
  )
}


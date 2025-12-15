'use client'

import SwitchIcon from '@/assets/theme-toggle.svg'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { framedButtonBase } from './button-styles'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggleTheme}
      className={`${framedButtonBase} w-10 h-10 p-1.5`}
      aria-label="Toggle theme"
    >
      <Image
        src={SwitchIcon}
        alt="Toggle theme"
        width={40}
        height={40}
        className="w-full h-full transition-colors duration-500 dark:invert"
      />
    </button>
  )
}




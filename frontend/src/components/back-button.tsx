'use client'

import { useRouter } from 'next/navigation'
import { framedButtonBase } from './button-styles'

interface BackButtonProps {
  onClick?: () => void
  href?: string
  children?: React.ReactNode
  className?: string
}

export default function BackButton({ 
  onClick, 
  href,
  children = 'Back',
  className = ''
}: Readonly<BackButtonProps>) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`${framedButtonBase} h-10 px-4 ${className}`}
    >
      <span className="font-pixelify text-xl md:text-2xl text-black dark:text-white transition-colors duration-500">
        {children}
      </span>
    </button>
  )
}




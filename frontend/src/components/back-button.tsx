'use client'

import { useRouter } from 'next/navigation'

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
      className={`h-10 bg-black shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] px-4 cursor-pointer hover:bg-gray-900 transition-colors ${className}`}
    >
      <span className="font-pixelify text-xl md:text-2xl text-white">
        {children}
      </span>
    </button>
  )
}

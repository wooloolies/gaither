'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/theme-toggle'
import BackButton from '@/components/back-button'
import { useSession, signOut } from '@/lib/auth/auth-client'
import userAvatarIcon from '@/assets/user-avatar.svg'

export default function Header() {
  const pathname = usePathname()
  const showBackButton = pathname !== '/'
  const { data: session, isPending } = useSession()
  const isAuthenticated = !!session?.user
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut();
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-8 lg:px-12 py-6 transition-colors duration-500 bg-white/80 dark:bg-[#3c3c3c]/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50">
      {/* Logo or Back Button */}
      {showBackButton ? (
        <BackButton href="/" />
      ) : (
        <div className="flex items-end gap-8">
          <Link href="/">
            <h1 className="font-pixelify text-3xl md:text-4xl tracking-tight transition-colors duration-500 text-black dark:text-white hover:opacity-80 cursor-pointer">
              Gaither
            </h1>
          </Link>
          <nav className="hidden md:block">
            <Link
              href="/about"
              className="font-stzhongsong text-lg transition-colors duration-500 text-black hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
            >
              About Us
            </Link>
          </nav>
        </div>
      )}

      {/* Right side navigation */}
      <div className="flex items-center gap-4">
        {!isPending && (
          <>
            {isAuthenticated ? (
              <button
                onClick={handleSignOut}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-black dark:border-white transition-colors duration-500 text-black dark:text-white hover:opacity-80 cursor-pointer"
                aria-label="Sign out"
              >
                <Image
                  src={userAvatarIcon}
                  alt="User avatar"
                  width={40}
                  height={40}
                  className="w-full h-full"
                />
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:block font-stzhongsong text-lg transition-colors duration-500 text-black hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
                >
                  Log in
                </Link>
                <Button
                  asChild
                  className="font-stzhongsong text-base px-6 py-5 rounded-[20px] transition-colors duration-500 bg-[#222] hover:bg-[#333] text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black"
                >
                  <Link href="/login?mode=signup">
                    Join Now
                  </Link>
                </Button>
              </>
            )}
          </>
        )}
        
        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>
    </header>
  )
}

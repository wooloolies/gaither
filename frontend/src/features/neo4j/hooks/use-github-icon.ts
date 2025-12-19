import { useRef, useEffect } from 'react'
import githubIconWhite from '@/assets/github-icon-white.svg'

export function useGitHubIcon() {
    const githubIconRef = useRef<HTMLImageElement | null>(null)

    useEffect(() => {
        const img = new Image()
        img.onload = () => {
            githubIconRef.current = img
        }
        img.src = githubIconWhite.src
    }, [])

    return githubIconRef
}

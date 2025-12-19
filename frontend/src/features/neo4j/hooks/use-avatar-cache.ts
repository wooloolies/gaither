import { useRef, useEffect } from 'react'
import type { GraphData } from '../types/graph-types'
import { isUserNode } from '../utils/node-helpers'

export function useAvatarCache(graphData: GraphData) {
    const avatarCache = useRef<Map<string, HTMLImageElement>>(new Map())

    const loadAvatar = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            if (avatarCache.current.has(url)) {
                resolve(avatarCache.current.get(url)!)
                return
            }

            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                avatarCache.current.set(url, img)
                resolve(img)
            }
            img.onerror = () => {
                reject(new Error('Failed to load avatar'))
            }
            img.src = url
        })
    }

    // Pre-load avatars when graph data changes
    useEffect(() => {
        graphData.nodes.forEach((node) => {
            const avatarUrl = node.avatarUrl || node.avatar_url

            if (isUserNode(node) && avatarUrl && !avatarCache.current.has(avatarUrl)) {
                loadAvatar(avatarUrl).catch(err => {
                    console.warn(`Failed to load avatar for ${node.username}:`, err)
                })
            }
        })
    }, [graphData])

    return { avatarCache: avatarCache.current, loadAvatar }
}

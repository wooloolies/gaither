import type { GraphNode } from '../types/graph-types'
import { AVATAR_FALLBACK_COLORS, NODE_TYPE_COLORS } from '../constants/graph-constants'

export const getColorFromUsername = (username: string): string => {
    let hash = 0
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    return AVATAR_FALLBACK_COLORS[Math.abs(hash) % AVATAR_FALLBACK_COLORS.length]
}

export const getNodeColor = (node: GraphNode): string => {
    if (node.type === 'relationship_label') return '#999'

    const nodeLabels = node.labels || []
    const identifier = nodeLabels.length > 0
        ? nodeLabels.sort().join(',')
        : String(node.label || node.id || '')

    let hash = 0
    for (let i = 0; i < identifier.length; i++) {
        hash = (identifier.codePointAt(i) || 0) + ((hash << 5) - hash)
    }

    return NODE_TYPE_COLORS[Math.abs(hash) % NODE_TYPE_COLORS.length]
}

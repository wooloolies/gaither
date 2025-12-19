import type { GraphNode } from '../types/graph-types'

export const isUserNode = (node: GraphNode): boolean =>
    node.labels?.includes('User') || node.labels?.includes('Candidate') || !!node.username

export const isRepoNode = (node: GraphNode): boolean =>
    node.labels?.includes('Repo') || node.label === 'Repo'

export const isCandidateNode = (node: GraphNode, username: string): boolean =>
    node.username === username

export const getNodeDisplayName = (node: GraphNode): string =>
    String(node.name || node.username || node.id)

export const getInitials = (username: string): string => {
    if (!username) return '?'
    return username.substring(0, 2).toUpperCase()
}

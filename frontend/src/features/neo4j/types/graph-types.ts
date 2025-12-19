export interface GraphNode {
    id: string
    name?: string
    username?: string
    labels?: string[]
    label?: string
    type?: string
    avatarUrl?: string
    avatar_url?: string
    val?: number
    fx?: number
    fy?: number
    x?: number
    y?: number
    __bckgDimensions?: [number, number]
    analysis?: string
    description?: string
}

export interface GraphLink {
    source: string | GraphNode
    target: string | GraphNode
    type?: string
    isRelationshipPart?: boolean
}

export interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
}

export interface CandidateGraphProps {
    username: string
    height?: number
    onUsernameChange?: (newUsername: string) => void
}

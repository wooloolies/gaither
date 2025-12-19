import type { GraphNode } from '../types/graph-types'
import {
    CANDIDATE_AVATAR_RADIUS,
    USER_AVATAR_RADIUS,
    CANDIDATE_LABEL_FONT_SIZE,
    USER_LABEL_FONT_SIZE,
    REPO_FONT_SIZE,
    REPO_ICON_SIZE,
    REPO_PADDING_X,
    REPO_PADDING_Y,
    REPO_GAP
} from '../constants/graph-constants'
import { getColorFromUsername, getNodeColor } from './color-utils'
import { getInitials, getNodeDisplayName, isCandidateNode, isUserNode, isRepoNode } from './node-helpers'

interface RenderContext {
    ctx: CanvasRenderingContext2D
    globalScale: number
    username: string
    avatarCache: Map<string, HTMLImageElement>
    githubIcon: HTMLImageElement | null
}

export function renderRelationshipLabel(
    node: GraphNode,
    { ctx, globalScale }: RenderContext
): void {
    const label = getNodeDisplayName(node)
    const fontSize = 12 / globalScale
    ctx.font = `${fontSize}px Sans-Serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const textWidth = ctx.measureText(label).width
    const padding = fontSize * 0.4
    const bckgDimensions: [number, number] = [textWidth + padding, fontSize + padding]

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fillRect(
        node.x! - bckgDimensions[0] / 2,
        node.y! - bckgDimensions[1] / 2,
        bckgDimensions[0],
        bckgDimensions[1]
    )

    ctx.strokeStyle = 'transparent'
    ctx.lineWidth = 1 / globalScale
    ctx.strokeRect(
        node.x! - bckgDimensions[0] / 2,
        node.y! - bckgDimensions[1] / 2,
        bckgDimensions[0],
        bckgDimensions[1]
    )

    ctx.fillStyle = '#666'
    ctx.fillText(label, node.x!, node.y!)

    node.__bckgDimensions = bckgDimensions
}

export function renderRepoNode(
    node: GraphNode,
    { ctx, githubIcon }: RenderContext
): void {
    const repoName = node.name || node.id
    const fontSize = REPO_FONT_SIZE
    const iconSize = REPO_ICON_SIZE
    const paddingX = REPO_PADDING_X
    const paddingY = REPO_PADDING_Y
    const gap = REPO_GAP

    ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
    const textWidth = ctx.measureText(repoName).width
    const totalWidth = paddingX + iconSize + gap + textWidth + paddingX
    const totalHeight = Math.max(iconSize, fontSize) + paddingY * 2
    const borderRadius = totalHeight / 2

    const startX = node.x! - totalWidth / 2
    const startY = node.y! - totalHeight / 2

    // Draw rounded pill background
    ctx.beginPath()
    ctx.roundRect(startX, startY, totalWidth, totalHeight, borderRadius)
    ctx.fillStyle = '#24292e'
    ctx.fill()

    // Draw GitHub icon
    if (githubIcon) {
        const iconX = startX + paddingX
        const iconY = node.y! - iconSize / 2
        ctx.drawImage(githubIcon, iconX, iconY, iconSize, iconSize)
    }

    // Draw repo name
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(repoName, startX + paddingX + iconSize + gap, node.y!)

    node.__bckgDimensions = [totalWidth, totalHeight]
}

export function renderUserNode(
    node: GraphNode,
    { ctx, globalScale, username, avatarCache }: RenderContext
): void {
    const isCandidate = isCandidateNode(node, username)
    const avatarUrl = node.avatarUrl || node.avatar_url
    const displayName = getNodeDisplayName(node)
    const radius = isCandidate ? CANDIDATE_AVATAR_RADIUS : USER_AVATAR_RADIUS
    const labelFontSize = (isCandidate ? CANDIDATE_LABEL_FONT_SIZE : USER_LABEL_FONT_SIZE) / globalScale

    // Try to draw avatar image
    let drewAvatar = false
    if (avatarUrl && avatarCache.has(avatarUrl)) {
        const img = avatarCache.get(avatarUrl)!

        ctx.save()
        ctx.beginPath()
        ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI)
        ctx.closePath()
        ctx.clip()

        ctx.drawImage(img, node.x! - radius, node.y! - radius, radius * 2, radius * 2)
        ctx.restore()

        // Border
        ctx.beginPath()
        ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI)
        ctx.strokeStyle = isCandidate ? '#c43787' : '#2196F3'
        ctx.lineWidth = (isCandidate ? 3 : 2) / globalScale
        ctx.stroke()

        drewAvatar = true
    }

    // Fallback to initials
    if (!drewAvatar) {
        const initials = getInitials(displayName)
        const bgColor = getColorFromUsername(displayName)

        ctx.beginPath()
        ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI)
        ctx.fillStyle = bgColor
        ctx.fill()

        ctx.strokeStyle = isCandidate ? '#c43787' : '#2196F3'
        ctx.lineWidth = (isCandidate ? 3 : 2) / globalScale
        ctx.stroke()

        const initialsFontSize = radius * 0.8
        ctx.font = `bold ${initialsFontSize}px Sans-Serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(initials, node.x!, node.y!)
    }

    // Username label below avatar
    ctx.font = `${labelFontSize}px Sans-Serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const labelText = displayName
    const labelWidth = ctx.measureText(labelText).width
    const labelPadding = 4 / globalScale
    const labelY = node.y! + radius + (4 / globalScale)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillRect(
        node.x! - labelWidth / 2 - labelPadding,
        labelY,
        labelWidth + labelPadding * 2,
        labelFontSize + labelPadding
    )

    ctx.fillStyle = '#333'
    ctx.fillText(labelText, node.x!, labelY + labelPadding / 2)

    node.__bckgDimensions = [radius * 2, radius * 2 + labelFontSize + 8]
}

export function renderDefaultNode(
    node: GraphNode,
    { ctx, globalScale }: RenderContext
): void {
    const label = getNodeDisplayName(node)
    const baseFontSize = 16
    const fontSize = baseFontSize / globalScale
    ctx.font = `bold ${fontSize}px Sans-Serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const textWidth = ctx.measureText(label).width
    const bckgDimensions: [number, number] = [textWidth + fontSize * 0.3, fontSize + fontSize * 0.3]

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillRect(
        node.x! - bckgDimensions[0] / 2,
        node.y! - bckgDimensions[1] / 2,
        bckgDimensions[0],
        bckgDimensions[1]
    )

    const nodeColor = getNodeColor(node)
    ctx.fillStyle = nodeColor
    ctx.fillText(label, node.x!, node.y!)

    node.__bckgDimensions = bckgDimensions
}

export function renderNode(node: GraphNode, context: RenderContext): void {
    if (node.type === 'relationship_label') {
        renderRelationshipLabel(node, context)
        return
    }

    if (isRepoNode(node)) {
        renderRepoNode(node, context)
        return
    }

    if (isUserNode(node)) {
        renderUserNode(node, context)
        return
    }

    renderDefaultNode(node, context)
}

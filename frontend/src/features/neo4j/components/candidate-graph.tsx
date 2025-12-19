'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import * as d3 from 'd3'

import type { CandidateGraphProps, GraphNode } from '../types/graph-types'
import { useGraphData, useAvatarCache, useGitHubIcon } from '../hooks'
import { renderNode } from '../utils/node-renderers'
import { isUserNode, isRepoNode, isCandidateNode, getNodeDisplayName } from '../utils/node-helpers'
import { getNodeColor } from '../utils/color-utils'
import {
    CANDIDATE_AVATAR_RADIUS,
    USER_AVATAR_RADIUS,
    CANDIDATE_LABEL_FONT_SIZE,
    USER_LABEL_FONT_SIZE,
    REPO_FONT_SIZE,
    REPO_ICON_SIZE
} from '../constants/graph-constants'

import { GraphLegend } from './graph-legend'
import { GraphResetButton } from './graph-reset-button'
import { RepoAnalysisModal } from './repo-analysis-modal'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

function CandidateGraph({ username, height = 600, onUsernameChange }: CandidateGraphProps) {
    const [dimensions, setDimensions] = useState({ width: 800, height })
    const [selectedRepo, setSelectedRepo] = useState<GraphNode | null>(null)
    const graphRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [initialUsername] = useState(username)

    const { graphData, loading, error } = useGraphData(username)
    const { avatarCache } = useAvatarCache(graphData)
    const githubIconRef = useGitHubIcon()

    // Reset function
    const handleReset = () => {
        graphData.nodes.forEach((node) => {
            if (node.username !== username) {
                node.fx = undefined
                node.fy = undefined
            }
        })

        if (graphRef.current) {
            graphRef.current.d3ReheatSimulation()
            setTimeout(() => {
                if (graphRef.current) {
                    graphRef.current.zoomToFit(400, 50)
                    setTimeout(() => {
                        if (graphRef.current) {
                            graphRef.current.centerAt(0, 0, 300)
                        }
                    }, 450)
                }
            }, 100)
        }

        if (onUsernameChange && username !== initialUsername) {
            onUsernameChange(initialUsername)
        }
    }

    // Container resize observer
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                if (rect.width > 0 && rect.height > 0) {
                    setDimensions({ width: rect.width, height: rect.height })
                }
            }
        }

        const resizeObserver = new ResizeObserver(updateDimensions)
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        updateDimensions()
        const timeoutId = setTimeout(updateDimensions, 100)

        return () => {
            resizeObserver.disconnect()
            clearTimeout(timeoutId)
        }
    }, [graphData])

    // Configure d3 forces
    useEffect(() => {
        if (graphRef.current && graphData.nodes.length > 0) {
            const fg = graphRef.current

            fg.d3Force('collision', d3.forceCollide().radius((node: any) => {
                const isCandidate = isCandidateNode(node, username)

                if (isUserNode(node)) {
                    const avatarRadius = isCandidate ? CANDIDATE_AVATAR_RADIUS : USER_AVATAR_RADIUS
                    const labelHeight = isCandidate ? CANDIDATE_LABEL_FONT_SIZE : USER_LABEL_FONT_SIZE
                    return avatarRadius + labelHeight + 8
                }

                if (isRepoNode(node)) {
                    const repoName = node.name || node.id || ''
                    const textWidth = repoName.length * REPO_FONT_SIZE * 0.55
                    const totalWidth = 24 + REPO_ICON_SIZE + 8 + textWidth
                    return totalWidth / 2 + 12
                }

                if (node.type === 'relationship_label') {
                    const textWidth = (node.name || '').length * 12 * 0.6
                    return textWidth * 0.6
                }

                const label = String(node.name || node.username || node.id)
                const textWidth = label.length * 16 * 0.6
                return (textWidth + 48) / 2 * 2.0
            }).strength(1.0).iterations(10))

            fg.d3Force('link').distance(150).strength(0.5)
            fg.d3Force('charge').strength(-2000)
            fg.d3Force('center').strength(0.05)
            fg.d3Force('x', d3.forceX().strength(0.02))
            fg.d3Force('y', d3.forceY().strength(0.02))
        }
    }, [graphData, username])

    // Fix candidate node at center
    useEffect(() => {
        if (graphRef.current && graphData.nodes.length > 0 && dimensions.width > 0) {
            const candidateNode = graphData.nodes.find((n) => n.username === username)
            if (candidateNode) {
                candidateNode.fx = 0
                candidateNode.fy = 0
            }

            const timeoutId = setTimeout(() => {
                if (graphRef.current) {
                    graphRef.current.zoomToFit(400, 50)
                    setTimeout(() => {
                        if (graphRef.current) {
                            graphRef.current.centerAt(0, 0, 300)
                        }
                    }, 450)
                }
            }, 500)
            return () => clearTimeout(timeoutId)
        }
    }, [graphData, dimensions, username])

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                Loading graph for {username}...
            </div>
        )
    }

    if (error) {
        return (
            <div style={{
                color: 'red',
                padding: '1rem',
                backgroundColor: '#ffe6e6',
                borderRadius: '4px'
            }}>
                <strong>Error:</strong> {error}
            </div>
        )
    }

    if (graphData.nodes.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                No graph data found for {username}.
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                overflow: 'hidden',
                backgroundColor: '#fff',
                width: '100%',
                height: `${height}px`,
                position: 'relative'
            }}
        >
            <GraphResetButton onReset={handleReset} />
            <GraphLegend graphData={graphData} />

            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel={(node: any) => {
                    if (node.type === 'relationship_label') return ''
                    return String(node.name || node.username || node.id)
                }}
                nodeColor={(node: any) => getNodeColor(node)}
                linkLabel={() => ''}
                nodeVal={(node: any) => {
                    if (isCandidateNode(node, username)) return 5
                    if (node.type === 'relationship_label') return 1
                    return 3
                }}
                width={dimensions.width}
                height={dimensions.height}
                cooldownTicks={100}
                enableNodeDrag={true}
                onNodeDragEnd={(node: any) => {
                    node.fx = node.x
                    node.fy = node.y
                    if (graphRef.current) {
                        graphRef.current.d3ReheatSimulation()
                    }
                }}
                onNodeClick={(node: any) => {
                    if (node.type === 'relationship_label') return

                    if (isRepoNode(node) && node.name) {
                        setSelectedRepo(node)
                        return
                    }

                    if (isUserNode(node) && node.username && !isCandidateNode(node, username)) {
                        if (onUsernameChange) {
                            onUsernameChange(node.username)
                        }
                    }
                }}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    renderNode(node, {
                        ctx,
                        globalScale,
                        username,
                        avatarCache,
                        githubIcon: githubIconRef.current
                    })
                }}
                linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
                    ctx.beginPath()
                    ctx.moveTo(link.source.x, link.source.y)
                    ctx.lineTo(link.target.x, link.target.y)
                    ctx.strokeStyle = '#ccc'
                    ctx.lineWidth = 0.5
                    ctx.stroke()
                }}
                nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                    if (isUserNode(node)) {
                        const isCandidate = isCandidateNode(node, username)
                        const radius = isCandidate ? CANDIDATE_AVATAR_RADIUS : USER_AVATAR_RADIUS

                        ctx.fillStyle = color
                        ctx.beginPath()
                        ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI)
                        ctx.fill()

                        const labelFontSize = isCandidate ? CANDIDATE_LABEL_FONT_SIZE : USER_LABEL_FONT_SIZE
                        const labelText = getNodeDisplayName(node)
                        const labelWidth = ctx.measureText(labelText).width || labelText.length * labelFontSize * 0.6
                        const labelY = node.y! + radius + 4
                        ctx.fillRect(node.x! - labelWidth / 2 - 4, labelY, labelWidth + 8, labelFontSize + 4)
                    } else {
                        ctx.fillStyle = color
                        const bckgDimensions = node.__bckgDimensions
                        if (bckgDimensions) {
                            ctx.fillRect(
                                node.x! - bckgDimensions[0] / 2,
                                node.y! - bckgDimensions[1] / 2,
                                bckgDimensions[0],
                                bckgDimensions[1]
                            )
                        }
                    }
                }}
            />

            {selectedRepo && (
                <RepoAnalysisModal
                    repo={selectedRepo}
                    username={username}
                    onClose={() => setSelectedRepo(null)}
                />
            )}
        </div>
    )
}

export default CandidateGraph

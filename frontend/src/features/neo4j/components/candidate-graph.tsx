'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import * as d3 from 'd3'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface CandidateGraphProps {
    username: string
    height?: number
}

function CandidateGraph({ username, height = 600 }: CandidateGraphProps) {
    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dimensions, setDimensions] = useState({ width: 800, height })
    const graphRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Measure container size using ResizeObserver for reliable sizing
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                if (rect.width > 0 && rect.height > 0) {
                    setDimensions({ width: rect.width, height: rect.height })
                }
            }
        }

        // Use ResizeObserver for more reliable container measurement
        const resizeObserver = new ResizeObserver(() => {
            updateDimensions()
        })

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        // Also measure on initial load and after a small delay to ensure container is rendered
        updateDimensions()
        const timeoutId = setTimeout(updateDimensions, 100)

        window.addEventListener('resize', updateDimensions)
        return () => {
            window.removeEventListener('resize', updateDimensions)
            resizeObserver.disconnect()
            clearTimeout(timeoutId)
        }
    }, [graphData]) // Re-run when graphData changes (container becomes visible)

    // Fetch graph data when username changes
    useEffect(() => {
        if (!username) return

        const fetchCandidateGraph = async () => {
            setLoading(true)
            setError(null)
            try {
                const response = await fetch(`http://localhost:8000/api/neo4j/candidates/${username}`)

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`)
                }

                const data = await response.json()
                console.log('Graph Data:', data)
                setGraphData(data)
                setLoading(false)
            } catch (err: any) {
                console.error('Failed to fetch graph data:', err)
                setError(err.message || 'Failed to load graph data')
                setLoading(false)
            }
        }

        fetchCandidateGraph()
    }, [username])

    // Configure d3 forces
    useEffect(() => {
        if (graphRef.current && graphData.nodes.length > 0) {
            const fg = graphRef.current

            // Add collision force to prevent text label overlap
            // Each node should be spaced 1.5x its size from others
            fg.d3Force('collision', d3.forceCollide().radius((node: any) => {
                const label = String(node.name || node.username || node.id)
                const isCandidate = node.username === username
                const fontSize = isCandidate ? 24 : 16
                const textWidth = label.length * fontSize * 0.6
                const padding = fontSize * 0.3
                const textBoxWidth = textWidth + padding * 2
                const textBoxHeight = fontSize + padding * 2
                // Use the larger dimension as base size, then multiply by 1.5
                const nodeSize = Math.max(textBoxWidth, textBoxHeight) / 2
                return nodeSize * 1.5
            }).strength(1.0).iterations(5))

            // Adjust link distance - increase to spread nodes more
            fg.d3Force('link').distance(250).strength(0.2)

            // Stronger charge to push nodes apart
            fg.d3Force('charge').strength(-1200)

            // Center force
            fg.d3Force('center').strength(0.05)

            // X and Y forces - reduced to allow more freedom
            fg.d3Force('x', d3.forceX().strength(0.02))
            fg.d3Force('y', d3.forceY().strength(0.02))
        }
    }, [graphData, username])

    // Fix candidate node at center and zoom to fit
    useEffect(() => {
        if (graphRef.current && graphData.nodes.length > 0 && dimensions.width > 0) {
            // Find the candidate node and fix it at the center
            const candidateNode = graphData.nodes.find((n: any) => n.username === username)
            if (candidateNode) {
                // Fix the candidate node at the center (0, 0 in graph coordinates)
                candidateNode.fx = 0
                candidateNode.fy = 0
            }

            // Wait for simulation to settle and canvas to be properly sized
            const timeoutId = setTimeout(() => {
                if (graphRef.current) {
                    // First zoom to fit all nodes
                    graphRef.current.zoomToFit(400, 50)
                    // Then center on the candidate node after zoom completes
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

    // Generate color for each node based on its labels (node type)
    const getNodeColor = (node: any) => {
        const colors = [
            '#c43787', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0',
            '#F44336', '#00BCD4', '#FF5722', '#607D8B', '#E91E63',
            '#795548', '#3F51B5', '#009688', '#FFC107', '#CDDC39',
            '#FF4081', '#00E676', '#FF6E40', '#7C4DFF', '#18FFFF'
        ]

        const nodeLabels = node.labels || []
        const identifier = nodeLabels.length > 0
            ? nodeLabels.sort().join(',')
            : String(node.label || node.id || '')

        let hash = 0
        for (let i = 0; i < identifier.length; i++) {
            hash = identifier.codePointAt(i) + ((hash << 5) - hash)
        }

        const colorIndex = Math.abs(hash) % colors.length
        return colors[colorIndex]
    }

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
                height: `${height}px`
            }}
        >
            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel={(node: any) => String(node.name || node.username || node.id)}
                nodeColor={(node: any) => getNodeColor(node)}
                linkLabel={(link: any) => String(link.type || '')}
                linkColor={() => '#999'}
                linkWidth={2}
                nodeVal={(node: any) => node.username === username ? 5 : 1}
                width={dimensions.width}
                height={dimensions.height}
                cooldownTicks={100}
                enableNodeDrag={true}
                onNodeDragEnd={(node: any) => {
                    // Fix node at dragged position so it doesn't snap back
                    node.fx = node.x
                    node.fy = node.y
                }}
                onNodeClick={(node: any) => {
                    // Check if this is a Repo node
                    const isRepo = node.labels?.includes('Repo') || node.label === 'Repo'
                    if (isRepo && node.name) {
                        // Construct GitHub URL from node name and open in new tab
                        const githubUrl = `https://github.com/${node.name}`
                        window.open(githubUrl, '_blank', 'noopener,noreferrer')
                    }
                }}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = String(node.name || node.username || node.id)
                    const isCandidate = node.username === username
                    const isRepo = node.labels?.includes('Repo') || node.label === 'Repo'
                    const baseFontSize = isCandidate ? 24 : 16
                    const fontSize = baseFontSize / globalScale
                    ctx.font = `bold ${fontSize}px Sans-Serif`
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'

                    const textWidth = ctx.measureText(label).width
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.3)

                    ctx.fillStyle = isCandidate ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.8)'
                    ctx.fillRect(
                        node.x - bckgDimensions[0] / 2,
                        node.y - bckgDimensions[1] / 2,
                        bckgDimensions[0],
                        bckgDimensions[1]
                    )

                    const nodeColor = getNodeColor(node)
                    ctx.fillStyle = nodeColor
                    ctx.fillText(label, node.x, node.y)

                    // Add underline for Repo nodes to indicate they're clickable
                    if (isRepo && node.name) {
                        ctx.beginPath()
                        ctx.moveTo(node.x - textWidth / 2, node.y + fontSize / 2)
                        ctx.lineTo(node.x + textWidth / 2, node.y + fontSize / 2)
                        ctx.strokeStyle = nodeColor
                        ctx.lineWidth = 1 / globalScale
                        ctx.stroke()
                    }

                    node.__bckgDimensions = bckgDimensions
                }}
                linkCanvasObject={(link: any, ctx, globalScale) => {
                    const start = link.source
                    const end = link.target

                    // Draw the line
                    ctx.beginPath()
                    ctx.moveTo(start.x, start.y)
                    ctx.lineTo(end.x, end.y)
                    ctx.strokeStyle = '#999'
                    ctx.lineWidth = 0.5
                    ctx.stroke()

                    // Draw the relationship type label
                    const label = String(link.type || '')
                    if (label) {
                        const midX = (start.x + end.x) / 2
                        const midY = (start.y + end.y) / 2

                        const fontSize = (12 / globalScale)
                        ctx.font = `${fontSize}px Sans-Serif`
                        ctx.textAlign = 'center'
                        ctx.textBaseline = 'middle'

                        // Draw background
                        const textWidth = ctx.measureText(label).width
                        const padding = fontSize * 0.2
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
                        ctx.fillRect(
                            midX - textWidth / 2 - padding,
                            midY - fontSize / 2 - padding,
                            textWidth + padding * 2,
                            fontSize + padding * 2
                        )

                        // Draw text
                        ctx.fillStyle = '#666'
                        ctx.fillText(label, midX, midY)
                    }
                }}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                    ctx.fillStyle = color
                    const bckgDimensions = node.__bckgDimensions
                    if (bckgDimensions) {
                        ctx.fillRect(
                            node.x - bckgDimensions[0] / 2,
                            node.y - bckgDimensions[1] / 2,
                            bckgDimensions[0],
                            bckgDimensions[1]
                        )
                    }
                }}
            />
        </div>
    )
}

export default CandidateGraph

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
    const [selectedRepo, setSelectedRepo] = useState<any>(null)
    const [repoAnalysis, setRepoAnalysis] = useState<string | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
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
                        setSelectedRepo(node)
                        setRepoAnalysis(null) // Reset analysis
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

            {/* Fetch Analysis Effect */}
            {selectedRepo && (
                <RepoAnalysisFetcher
                    repoName={selectedRepo.name}
                    onAnalysisComplete={setRepoAnalysis}
                    onAnalyzing={setIsAnalyzing}
                />
            )}

            {/* Repo Details Modal */}
            {selectedRepo && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setSelectedRepo(null)}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: '8px',
                        width: '500px',
                        maxWidth: '90%',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedRepo(null)}
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                background: 'none',
                                border: 'none',
                                fontSize: '20px',
                                cursor: 'pointer',
                                color: '#666'
                            }}
                        >
                            ×
                        </button>

                        <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>
                            {selectedRepo.name}
                        </h2>

                        <div style={{ marginBottom: '20px' }}>
                            <a
                                href={`https://github.com/${selectedRepo.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    backgroundColor: '#24292e',
                                    color: 'white',
                                    textDecoration: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 500
                                }}
                            >
                                <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                                </svg>
                                Open in GitHub
                            </a>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 500,
                                color: '#555',
                                fontSize: '14px'
                            }}>
                                Repository Analysis
                            </label>
                            <div style={{
                                width: '100%',
                                minHeight: '120px',
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                backgroundColor: '#f8f9fa',
                                color: selectedRepo.analysis || selectedRepo.description ? '#333' : '#999',
                                fontSize: '14px',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {isAnalyzing ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666' }}>
                                        <div className="spinner" style={{
                                            border: '3px solid #f3f3f3',
                                            borderTop: '3px solid #3498db',
                                            borderRadius: '50%',
                                            width: '20px',
                                            height: '20px',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        Analyzing repository content...
                                    </div>
                                ) : (
                                    repoAnalysis || selectedRepo.analysis || selectedRepo.description || "No analysis available."
                                )}
                            </div>
                            <style jsx>{`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function RepoAnalysisFetcher({ repoName, onAnalysisComplete, onAnalyzing }: {
    repoName: string,
    onAnalysisComplete: (analysis: string) => void,
    onAnalyzing: (isAnalyzing: boolean) => void
}) {
    useEffect(() => {
        let mounted = true

        async function analyze() {
            // Basic valid format check
            if (!repoName || !repoName.includes('/')) return

            onAnalyzing(true)
            try {
                const res = await fetch('http://localhost:8000/api/analysis/repo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repo_url: `github.com/${repoName}` })
                })

                if (res.ok) {
                    const data = await res.json()
                    if (mounted && data.analysis) {
                        onAnalysisComplete(data.analysis)
                    }
                } else {
                    if (mounted) onAnalysisComplete("Failed to fetch analysis.")
                }
            } catch (err) {
                if (mounted) onAnalysisComplete("Error connecting to analysis service.")
            } finally {
                if (mounted) onAnalyzing(false)
            }
        }

        analyze()
        return () => { mounted = false }
    }, [repoName])

    return null
}

export default CandidateGraph

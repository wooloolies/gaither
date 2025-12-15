'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import * as d3 from 'd3'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface CandidateGraphProps {
    username: string
    height?: number
    onUsernameChange?: (newUsername: string) => void
}

function CandidateGraph({ username, height = 600, onUsernameChange }: CandidateGraphProps) {
    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dimensions, setDimensions] = useState({ width: 800, height })
    const [selectedRepo, setSelectedRepo] = useState<any>(null)
    const [repoAnalysis, setRepoAnalysis] = useState<string | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const graphRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [initialUsername] = useState(username) // Store initial username for reset

    // Reset function to restore graph to initial state
    const handleReset = () => {
        // Clear all fixed positions
        graphData.nodes.forEach((node: any) => {
            if (node.username !== username) {
                node.fx = undefined
                node.fy = undefined
            }
        })

        // Recenter and zoom
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

        // If we navigated to a different user, reset to initial
        if (onUsernameChange && username !== initialUsername) {
            onUsernameChange(initialUsername)
        }
    }

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

                const rawData = await response.json()

                // Transform links into nodes to prevent text overlap
                // We create a "Label Node" for each relationship that sits between source and target
                const nodes = [...(rawData.nodes || [])];
                const links: any[] = [];

                if (rawData.links) {
                    rawData.links.forEach((link: any) => {
                        const labelNodeId = `rel_${link.source}_${link.target}_${link.type}`;

                        // Create the label node
                        nodes.push({
                            id: labelNodeId,
                            name: link.type,     // Text to display
                            type: 'relationship_label', // Marker
                            val: 1
                        });

                        // Create two links: Source -> Label -> Target
                        links.push({
                            source: link.source,
                            target: labelNodeId,
                            isRelationshipPart: true
                        });
                        links.push({
                            source: labelNodeId,
                            target: link.target,
                            isRelationshipPart: true
                        });
                    });
                }

                // Sort nodes so the candidate node is last (renders on top)
                if (nodes.length > 0) {
                    nodes.sort((a: any, b: any) => {
                        // Candidate on top
                        if (a.username === username) return 1;
                        if (b.username === username) return -1;
                        // Label nodes at bottom (so lines go under main nodes if they cross)
                        if (a.type === 'relationship_label' && b.type !== 'relationship_label') return -1;
                        if (a.type !== 'relationship_label' && b.type === 'relationship_label') return 1;
                        return 0;
                    });
                }

                const transformedData = { nodes, links };
                console.log('Graph Data Transformed:', transformedData)
                setGraphData(transformedData)
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
            // Significantly increased spacing to strictly prevent overlap
            fg.d3Force('collision', d3.forceCollide().radius((node: any) => {
                const label = String(node.name || node.username || node.id)
                const isCandidate = node.username === username

                // Extra buffer for candidate node
                if (isCandidate) return 100;

                const fontSize = node.type === 'relationship_label' ? 12 : 16
                const textWidth = label.length * fontSize * 0.6
                // Large padding to ensure no overlaps
                const padding = fontSize * (node.type === 'relationship_label' ? 0.8 : 1.5)
                const textBoxWidth = textWidth + padding * 2
                const textBoxHeight = fontSize + padding * 2

                // Use the larger dimension as base size
                const nodeSize = Math.max(textBoxWidth, textBoxHeight) / 2
                return nodeSize * (node.type === 'relationship_label' ? 1.2 : 2.0)
            }).strength(1.0).iterations(10)) // Max strength and more iterations for rigidity

            // Adjust link distance - reduced slightly since links are now split in two segments
            // Total distance Source -> Label -> Target will be approx 2x this
            fg.d3Force('link').distance(150).strength(0.5)

            // Very strong charge to push nodes apart aggressively
            fg.d3Force('charge').strength(-2000)

            // Center force
            fg.d3Force('center').strength(0.05)

            // X and Y forces
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
        if (node.type === 'relationship_label') return '#999'; // Gray for links

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

    // Get unique node types for legend
    const getLegendItems = () => {
        const typeColorMap = new Map<string, string>();

        // Friendly display names for labels
        const labelDisplayNames: Record<string, string> = {
            'Repo': 'Repository',
            'User': 'Username',
            'Skill': 'Skill',
            'Location': 'Location',
            'Education': 'Education',
            'Candidate': 'Candidate'
        };

        graphData.nodes.forEach((node: any) => {
            if (node.type === 'relationship_label') return; // Skip relationship labels

            const nodeLabels = node.labels || []
            const rawLabel = nodeLabels.length > 0
                ? nodeLabels.sort().join(',')
                : String(node.label || 'Unknown')

            // Use display name if available, otherwise use raw label
            const displayLabel = labelDisplayNames[rawLabel] || rawLabel

            if (!typeColorMap.has(displayLabel)) {
                typeColorMap.set(displayLabel, getNodeColor(node))
            }
        })

        return Array.from(typeColorMap.entries())
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
                height: `${height}px`,
                position: 'relative'
            }}
        >
            {/* Reset Button */}
            <button
                onClick={handleReset}
                style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 10,
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    color: '#333',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                Reset
            </button>

            {/* Legend */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    zIndex: 10,
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    maxWidth: '200px'
                }}
            >
                <div style={{ fontWeight: 600, marginBottom: '8px', color: '#333' }}>
                    Node Types
                </div>
                {getLegendItems().map(([label, color]) => (
                    <div
                        key={label}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px'
                        }}
                    >
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: color,
                            flexShrink: 0
                        }} />
                        <span style={{ color: '#555' }}>{label}</span>
                    </div>
                ))}
            </div>

            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel={(node: any) => {
                    if (node.type === 'relationship_label') return ''; // No tooltip for link labels
                    return String(node.name || node.username || node.id)
                }}
                nodeColor={(node: any) => getNodeColor(node)}
                // We handle link labels via nodes now, so no link labels needed
                linkLabel={() => ''}
                linkColor={() => '#ccc'} // Lighter link color
                linkWidth={1.5}
                nodeVal={(node: any) => {
                    if (node.username === username) return 5;
                    if (node.type === 'relationship_label') return 1;
                    return 3;
                }}
                width={dimensions.width}
                height={dimensions.height}
                cooldownTicks={100}
                enableNodeDrag={true}
                onNodeDragEnd={(node: any) => {
                    // Fix node at dragged position so it doesn't snap back
                    node.fx = node.x
                    node.fy = node.y

                    // Reheat simulation to ensure other nodes move away if they overlap
                    if (graphRef.current) {
                        graphRef.current.d3ReheatSimulation()
                    }
                }}
                onNodeClick={(node: any) => {
                    console.log('Node clicked:', node);

                    // Ignore relationship label nodes
                    if (node.type === 'relationship_label') return;

                    // Check if this is a Repo node
                    const isRepo = node.labels?.includes('Repo') || node.label === 'Repo'
                    if (isRepo && node.name) {
                        setSelectedRepo(node)
                        setRepoAnalysis(null) // Reset analysis
                        return;
                    }

                    // Check if this is a User node (has username)
                    const isUser = node.labels?.includes('User') || node.username
                    if (isUser && node.username && node.username !== username) {
                        if (onUsernameChange) {
                            onUsernameChange(node.username)
                        }
                    }
                }}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = String(node.name || node.username || node.id);

                    // Special rendering for Relationship Label Nodes
                    if (node.type === 'relationship_label') {
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        const textWidth = ctx.measureText(label).width;
                        const padding = fontSize * 0.4;
                        const bckgDimensions = [textWidth + padding, fontSize + padding];

                        // White background for readability
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                        ctx.fillRect(
                            node.x - bckgDimensions[0] / 2,
                            node.y - bckgDimensions[1] / 2,
                            bckgDimensions[0],
                            bckgDimensions[1]
                        );

                        // Border for label (invisible)
                        ctx.strokeStyle = 'transparent';
                        ctx.lineWidth = 1 / globalScale;
                        ctx.strokeRect(
                            node.x - bckgDimensions[0] / 2,
                            node.y - bckgDimensions[1] / 2,
                            bckgDimensions[0],
                            bckgDimensions[1]
                        );

                        ctx.fillStyle = '#666';
                        ctx.fillText(label, node.x, node.y);

                        node.__bckgDimensions = bckgDimensions;
                        return;
                    }

                    // Standard Node Rendering
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
                // Simple line link since labels are now nodes
                linkCanvasObject={(link: any, ctx, globalScale) => {
                    const start = link.source
                    const end = link.target

                    // Draw the line
                    ctx.beginPath()
                    ctx.moveTo(start.x, start.y)
                    ctx.lineTo(end.x, end.y)
                    ctx.strokeStyle = '#ccc'
                    ctx.lineWidth = 0.5
                    ctx.stroke()
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

                        <h1 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>
                            {selectedRepo.name}
                        </h1>

                        <div style={{ marginBottom: '20px' }}>
                            <a
                                href={`https://github.com/${username}/${selectedRepo.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#4285F4', // Blue color like in the screenshot
                                    textDecoration: 'none',
                                    fontSize: '16px',
                                    fontWeight: 400
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                                View GitHub Repository
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="7" y1="17" x2="17" y2="7"></line>
                                    <polyline points="7 7 17 7 17 17"></polyline>
                                </svg>
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

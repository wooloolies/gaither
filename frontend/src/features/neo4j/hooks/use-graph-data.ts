import { useState, useEffect } from 'react'
import type { GraphData, GraphNode } from '../types/graph-types'

export function useGraphData(username: string) {
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
                const nodes: GraphNode[] = [...(rawData.nodes || [])]
                const links: GraphData['links'] = []

                if (rawData.links) {
                    rawData.links.forEach((link: any) => {
                        const labelNodeId = `rel_${link.source}_${link.target}_${link.type}`

                        // Create the label node
                        nodes.push({
                            id: labelNodeId,
                            name: link.type,
                            type: 'relationship_label',
                            val: 1
                        })

                        // Create two links: Source -> Label -> Target
                        links.push({
                            source: link.source,
                            target: labelNodeId,
                            isRelationshipPart: true
                        })
                        links.push({
                            source: labelNodeId,
                            target: link.target,
                            isRelationshipPart: true
                        })
                    })
                }

                // Sort nodes so the candidate node is last (renders on top)
                if (nodes.length > 0) {
                    nodes.sort((a, b) => {
                        if (a.username === username) return 1
                        if (b.username === username) return -1
                        if (a.type === 'relationship_label' && b.type !== 'relationship_label') return -1
                        if (a.type !== 'relationship_label' && b.type === 'relationship_label') return 1
                        return 0
                    })
                }

                setGraphData({ nodes, links })
                setLoading(false)
            } catch (err: any) {
                console.error('Failed to fetch graph data:', err)
                setError(err.message || 'Failed to load graph data')
                setLoading(false)
            }
        }

        fetchCandidateGraph()
    }, [username])

    return { graphData, loading, error }
}

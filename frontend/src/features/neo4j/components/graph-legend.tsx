'use client'

import type { GraphData } from '../types/graph-types'
import { getNodeColor } from '../utils/color-utils'
import { LABEL_DISPLAY_NAMES } from '../constants/graph-constants'

interface GraphLegendProps {
    graphData: GraphData
}

export function GraphLegend({ graphData }: GraphLegendProps) {
    const getLegendItems = () => {
        const typeColorMap = new Map<string, string>()

        graphData.nodes.forEach((node) => {
            if (node.type === 'relationship_label') return

            const nodeLabels = node.labels || []
            const rawLabel = nodeLabels.length > 0
                ? nodeLabels.sort().join(',')
                : String(node.label || 'Unknown')

            const displayLabel = LABEL_DISPLAY_NAMES[rawLabel] || rawLabel

            if (!typeColorMap.has(displayLabel)) {
                typeColorMap.set(displayLabel, getNodeColor(node))
            }
        })

        return Array.from(typeColorMap.entries())
    }

    return (
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
    )
}

'use client'

import { useEffect, useState } from 'react'
import type { GraphNode } from '../types/graph-types'

interface RepoAnalysisModalProps {
    repo: GraphNode
    username: string
    onClose: () => void
}

export function RepoAnalysisModal({ repo, username, onClose }: RepoAnalysisModalProps) {
    const [analysis, setAnalysis] = useState<string | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    useEffect(() => {
        let mounted = true

        async function analyze() {
            if (!repo.name || !repo.name.includes('/')) return

            setIsAnalyzing(true)
            try {
                const res = await fetch('http://localhost:8000/api/analysis/repo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repo_url: `github.com/${repo.name}` })
                })

                if (res.ok) {
                    const data = await res.json()
                    if (mounted && data.analysis) {
                        setAnalysis(data.analysis)
                    }
                } else {
                    if (mounted) setAnalysis("Failed to fetch analysis.")
                }
            } catch {
                if (mounted) setAnalysis("Error connecting to analysis service.")
            } finally {
                if (mounted) setIsAnalyzing(false)
            }
        }

        analyze()
        return () => { mounted = false }
    }, [repo.name])

    return (
        <div
            style={{
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
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '8px',
                    width: '500px',
                    maxWidth: '90%',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
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
                    {repo.name}
                </h1>

                <div style={{ marginBottom: '20px' }}>
                    <a
                        href={`https://github.com/${username}/${repo.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#4285F4',
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
                        color: analysis || repo.description ? '#333' : '#999',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {isAnalyzing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666' }}>
                                <div style={{
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
                            analysis || repo.analysis || repo.description || "No analysis available."
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
    )
}

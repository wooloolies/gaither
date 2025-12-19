'use client'

interface GraphResetButtonProps {
    onReset: () => void
}

export function GraphResetButton({ onReset }: GraphResetButtonProps) {
    return (
        <button
            onClick={onReset}
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
    )
}

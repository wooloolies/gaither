'use client'

interface FloatingDocumentsProps {
  isDark: boolean
}

export default function FloatingDocuments({ isDark }: Readonly<FloatingDocumentsProps>) {
  const fillColor = isDark ? '#4a4a4a' : '#E5E5E5'
  const strokeColor = isDark ? '#5a5a5a' : '#CCCCCC'
  const fillColor2 = isDark ? '#3c3c3c' : '#F0F0F0'
  const strokeColor2 = isDark ? '#4a4a4a' : '#D4D4D4'
  const fillColor3 = isDark ? '#2a2a2a' : '#FAFAFA'
  const strokeColor3 = isDark ? '#3a3a3a' : '#BDBDBD'
  const accentColor = isDark ? '#3a3a3a' : '#E0E0E0'

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Document 1 - Top right */}
      <div className="absolute top-[12%] right-[8%] opacity-40 animate-float-slow">
        <svg
          width="60"
          height="72"
          viewBox="0 0 60 72"
          fill="none"
          className="rotate-[12deg]"
        >
          <rect x="4" y="4" width="52" height="64" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <line x1="12" y1="20" x2="48" y2="20" stroke={strokeColor} strokeWidth="2" />
          <line x1="12" y1="32" x2="48" y2="32" stroke={strokeColor} strokeWidth="2" />
          <line x1="12" y1="44" x2="36" y2="44" stroke={strokeColor} strokeWidth="2" />
        </svg>
      </div>

      {/* Document 2 - Top center-left */}
      <div className="absolute top-[4%] left-[30%] opacity-60 animate-float-medium">
        <svg
          width="50"
          height="60"
          viewBox="0 0 50 60"
          fill="none"
          className="-rotate-[14deg]"
        >
          <rect x="3" y="3" width="44" height="54" rx="4" fill={fillColor2} stroke={strokeColor2} strokeWidth="2" />
          <line x1="10" y1="16" x2="40" y2="16" stroke={strokeColor2} strokeWidth="2" />
          <line x1="10" y1="26" x2="40" y2="26" stroke={strokeColor2} strokeWidth="2" />
          <line x1="10" y1="36" x2="30" y2="36" stroke={strokeColor2} strokeWidth="2" />
        </svg>
      </div>

      {/* Document 3 - Left side, pixel style */}
      <div className="absolute top-[18%] left-[3%] opacity-70 animate-float-fast">
        <svg
          width="54"
          height="58"
          viewBox="0 0 54 58"
          fill="none"
          className="rotate-[30deg]"
        >
          <rect x="2" y="2" width="50" height="54" rx="2" fill={fillColor3} stroke={strokeColor3} strokeWidth="2" />
          <rect x="10" y="12" width="8" height="8" fill={accentColor} />
          <rect x="22" y="12" width="20" height="4" fill={accentColor} />
          <rect x="22" y="20" width="14" height="4" fill={accentColor} />
          <rect x="10" y="32" width="32" height="4" fill={accentColor} />
          <rect x="10" y="40" width="28" height="4" fill={accentColor} />
        </svg>
      </div>

      {/* Large floating notebook - Right side hero area */}
      <div className="absolute top-[52%] right-[12%] opacity-80 animate-float-slow">
        <svg
          width="120"
          height="100"
          viewBox="0 0 120 100"
          fill="none"
          className="rotate-[3deg]"
        >
          <rect x="4" y="4" width="112" height="92" rx="6" fill={fillColor3} stroke={strokeColor3} strokeWidth="2" />
          <line x1="20" y1="4" x2="20" y2="96" stroke={isDark ? '#3a3a3a' : '#E8E8E8'} strokeWidth="1" />
          <line x1="28" y1="24" x2="104" y2="24" stroke={isDark ? '#4a4a4a' : '#D8D8D8'} strokeWidth="1.5" />
          <line x1="28" y1="38" x2="104" y2="38" stroke={isDark ? '#4a4a4a' : '#D8D8D8'} strokeWidth="1.5" />
          <line x1="28" y1="52" x2="104" y2="52" stroke={isDark ? '#4a4a4a' : '#D8D8D8'} strokeWidth="1.5" />
          <line x1="28" y1="66" x2="80" y2="66" stroke={isDark ? '#4a4a4a' : '#D8D8D8'} strokeWidth="1.5" />
          <circle cx="12" cy="20" r="3" fill={accentColor} />
          <circle cx="12" cy="40" r="3" fill={accentColor} />
          <circle cx="12" cy="60" r="3" fill={accentColor} />
          <circle cx="12" cy="80" r="3" fill={accentColor} />
        </svg>
      </div>
    </div>
  )
}


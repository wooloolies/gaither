import type { Metrics } from '@/store/agent-store'

interface MetricsPanelProps {
  metrics: Metrics
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Live Metrics</h3>
      </div>

      {/* Average Score (Key Metric) */}
      <div className="bg-surface/30 rounded-lg p-5 border border-border flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 flex items-center justify-center mb-2">
          <svg className="transform -rotate-90 w-full h-full">
            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" className="text-border" fill="none" />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              className="text-accent-blue"
              fill="none"
              strokeDasharray={351}
              strokeDashoffset={351 - (351 * metrics.averageScore) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{metrics.averageScore}</span>
            <span className="text-[10px] uppercase text-muted-foreground font-mono">AVG FIT</span>
          </div>
        </div>
        <div className="text-xs text-center text-muted-foreground">Target Score: 75+</div>
      </div>

      {/* Simple Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface/30 p-4 rounded-lg border border-border">
          <div className="text-muted-foreground text-xs uppercase font-mono mb-1">Found</div>
          <div className="text-2xl font-bold text-foreground">{metrics.totalFound}</div>
        </div>
        <div className="bg-surface/30 p-4 rounded-lg border border-border">
          <div className="text-muted-foreground text-xs uppercase font-mono mb-1">Msgs</div>
          <div className="text-2xl font-bold text-foreground">{metrics.messagesGenerated}</div>
        </div>
        <div className="col-span-2 bg-surface/30 p-4 rounded-lg border border-border">
          <div className="text-muted-foreground text-xs uppercase font-mono mb-1">Elapsed Time</div>
          <div className="text-2xl font-bold text-foreground font-mono">{formatTime(metrics.timeElapsed)}</div>
        </div>
      </div>
    </div>
  )
}


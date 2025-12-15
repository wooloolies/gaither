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
      <h3 className="text-lg font-bold text-foreground">Metrics</h3>

      {/* Average Score (Key Metric) */}
      <div className="bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 rounded-2xl p-6 border border-border flex flex-col items-center justify-center">
        <div className="relative w-36 h-36 flex items-center justify-center mb-3">
          <svg className="transform -rotate-90 w-full h-full">
            <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="10" className="text-border" fill="none" />
            <circle
              cx="72"
              cy="72"
              r="64"
              stroke="currentColor"
              strokeWidth="10"
              className="text-accent-blue"
              fill="none"
              strokeDasharray={402}
              strokeDashoffset={402 - (402 * metrics.averageScore) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground">{metrics.averageScore}</span>
            <span className="text-xs text-muted-foreground mt-1">Avg Fit</span>
          </div>
        </div>
        <div className="text-sm text-center text-muted-foreground">Target: 75+</div>
      </div>

      {/* Stats Grid */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-surface/30 p-5 rounded-xl border border-border">
          <div className="text-muted-foreground text-xs mb-2">Candidates Found</div>
          <div className="text-3xl font-bold text-foreground">{metrics.totalFound}</div>
        </div>
        <div className="bg-white dark:bg-surface/30 p-5 rounded-xl border border-border">
          <div className="text-muted-foreground text-xs mb-2">Messages Generated</div>
          <div className="text-3xl font-bold text-foreground">{metrics.messagesGenerated}</div>
        </div>
        <div className="bg-white dark:bg-surface/30 p-5 rounded-xl border border-border">
          <div className="text-muted-foreground text-xs mb-2">Time Elapsed</div>
          <div className="text-3xl font-bold text-foreground">{formatTime(metrics.timeElapsed)}</div>
        </div>
      </div>
    </div>
  )
}


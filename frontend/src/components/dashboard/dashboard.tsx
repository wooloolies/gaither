'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAgentStore } from '@/store/agent-store'
import { useAgentWebSocket } from '@/hooks/use-websocket'
import { jobsApi, type JobResponse } from '@/lib/api-client'
import AgentStatus from '@/components/dashboard/agent-status'
import CandidateGrid from '@/components/candidate-grid'
import MetricsPanel from '@/components/dashboard/metrics-panel'

interface DashboardProps {
  initialJobId?: string | null
}

export default function Dashboard({ initialJobId = null }: DashboardProps) {
  const router = useRouter()
  const [jobId, setJobId] = useState<JobResponse['id'] | null>(initialJobId)
  const [isLoading, setIsLoading] = useState(false)

  const { agentStates, candidates, events, metrics, reset } = useAgentStore()
  const { isConnected } = useAgentWebSocket(jobId)

  // Sync jobId with initialJobId prop
  useEffect(() => {
    if (initialJobId) {
      setJobId(initialJobId)
    }
  }, [initialJobId])

  // Timer for elapsed time
  useEffect(() => {
    if (jobId && agentStates.hunter === 'active') {
      const startTime = Date.now()
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        useAgentStore.setState((state) => ({
          metrics: { ...state.metrics, timeElapsed: elapsed },
        }))
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [jobId, agentStates.hunter])

  const handleReset = () => {
    if (confirm('Are you sure you want to start a new search?')) {
      reset()
      router.push('/hire')
    }
  }

  const handleFindMore = async () => {
    if (!jobId) return
    setIsLoading(true)
    try {
      await jobsApi.findMore(jobId)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error finding more candidates:', error)
      alert('Error finding more candidates. Please check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  // Redirect to /hire if no jobId - should not render Dashboard without a job
  useEffect(() => {
    if (!jobId && !initialJobId) {
      router.push('/hire')
    }
  }, [jobId, initialJobId, router])

  // Show loading while redirecting
  if (!jobId) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <p className="font-stzhongsong text-xl text-foreground">Redirecting to job creation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background p-8">
      {/* Subtle pixel grid background */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col gap-8">
        {/* Header Bar */}
        <header className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="font-pixelify text-3xl md:text-4xl tracking-tight text-foreground">
              Gaither
            </h1>
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${isConnected
                ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-500'
                : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-500'
                }`}
            >
              {isConnected ? '● Online' : '● Offline'}
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 text-sm font-medium text-foreground bg-white dark:bg-panel border border-border rounded-xl hover:shadow-md transition-all"
          >
            New Search
          </button>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-12 gap-8 min-h-0 flex-1">
          {/* Left: Agent Status */}
          <div className="col-span-3 flex flex-col gap-6 overflow-hidden">
            <div className="flex-1 bg-white dark:bg-panel border border-border rounded-2xl overflow-hidden flex flex-col shadow-lg">
              <AgentStatus agentStates={agentStates} events={events} />
            </div>
          </div>

          {/* Center: Candidates */}
          <div className="col-span-6 bg-white dark:bg-panel border border-border rounded-2xl overflow-hidden flex flex-col shadow-lg">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Candidates</h2>
              <span className="text-sm text-muted-foreground">{candidates.length} found</span>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <CandidateGrid candidates={candidates} jobId={jobId} />
            </div>
            {candidates.length > 0 && (
              <div className="p-6 border-t border-border">
                <button
                  onClick={handleFindMore}
                  disabled={isLoading || agentStates.hunter === 'active'}
                  className="w-full px-6 py-3 text-sm font-medium text-white bg-accent-blue hover:bg-accent-blue/90 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {isLoading || agentStates.hunter === 'active' ? 'Searching...' : '🔍 Find More Candidates'}
                </button>
              </div>
            )}
          </div>

          {/* Right: Metrics */}
          <div className="col-span-3 flex flex-col gap-6">
            <div className="bg-white dark:bg-panel border border-border rounded-2xl p-6 shadow-lg">
              <MetricsPanel metrics={metrics} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



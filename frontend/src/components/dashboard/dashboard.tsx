'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAgentStore } from '@/store/agent-store'
import { useAgentWebSocket } from '@/hooks/use-websocket'
import { jobsApi, type JobRequest, type JobResponse } from '@/lib/api-client'
import JobForm from '@/components/dashboard/job-form'
import AgentStatus from '@/components/dashboard/agent-status'
import CandidateGrid from '@/components/candidate-grid'
import MetricsPanel from '@/components/dashboard/metrics-panel'

interface DashboardProps {
  initialJobId?: string | null
}

export default function Dashboard({ initialJobId = null }: DashboardProps) {
  const [jobId, setJobId] = useState<JobResponse['id'] | null>(initialJobId)
  const [isLoading, setIsLoading] = useState(false)

  const { agentStates, candidates, events, metrics, setCurrentJob, reset } = useAgentStore()
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

  const handleJobSubmit = async (jobData: JobRequest) => {
    setIsLoading(true)
    try {
      reset()
      const job = await jobsApi.create(jobData)
      setJobId(job.id)
      setCurrentJob(job)
      await jobsApi.start(job.id)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error starting job:', error)
      alert('Error starting job. Please check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to start a new search?')) {
      setJobId(null)
      reset()
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

  if (!jobId) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center p-6">
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

        <div className="relative z-10 max-w-6xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-pixelify text-5xl md:text-6xl mb-4 tracking-tight text-foreground">Gaither</h1>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
              Autonomous Multi-Agent Recruitment System
            </p>
          </motion.div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { title: 'Hunter', desc: 'Autonomous GitHub Scanning', color: 'text-emerald-500' },
              { title: 'Analyzer', desc: 'Deep Code Evaluation', color: 'text-blue-500' },
              { title: 'Engager', desc: 'Personalized Outreach', color: 'text-purple-500' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-white dark:bg-panel border border-border p-8 rounded-2xl hover:shadow-lg transition-all text-center"
              >
                <div className={`text-2xl font-bold mb-2 ${feature.color}`}>
                  {feature.title}
                </div>
                <div className="text-muted-foreground">{feature.desc}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-panel border border-border p-8 rounded-2xl shadow-xl"
          >
            <JobForm onSubmit={handleJobSubmit} isLoading={isLoading} />
          </motion.div>
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



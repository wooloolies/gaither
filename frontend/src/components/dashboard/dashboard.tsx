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
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 max-w-4xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-6xl font-black mb-6 tracking-tight text-white">Gaither</h1>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
              Autonomous Multi-Agent Recruitment System
            </p>
          </motion.div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { title: 'Hunter Agent', desc: 'Autonomous GitHub Scanning', color: 'text-accent-blue' },
              { title: 'Analyzer Agent', desc: 'Deep Code Evaluation', color: 'text-accent-cyan' },
              { title: 'Engager Agent', desc: 'Personalized Outreach', color: 'text-accent-purple' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-panel border border-border p-6 rounded-xl hover:border-border-high transition-colors text-center"
              >
                <div className={`font-mono text-xs font-bold uppercase tracking-wider mb-2 ${feature.color}`}>
                  {feature.title}
                </div>
                <div className="text-muted-foreground text-sm">{feature.desc}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-panel border border-border p-8 rounded-2xl shadow-xl"
          >
            <JobForm onSubmit={handleJobSubmit} isLoading={isLoading} />
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-3rem)] flex flex-col gap-6">
        {/* Header Bar */}
        <header className="flex items-center justify-between bg-panel border border-border px-6 py-4 rounded-xl shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Gaither <span className="text-accent-blue text-sm font-mono ml-2">v2.0</span>
            </h1>
            <div
              className={`px-3 py-1 rounded-full text-xs font-mono border ${isConnected
                ? 'bg-green-500/10 border-green-500/20 text-green-500'
                : 'bg-red-500/10 border-red-500/20 text-red-500'
                }`}
            >
              {isConnected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white hover:bg-surface rounded-lg transition-colors"
          >
            Stop & Reset
          </button>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-6 min-h-0 flex-1">
          {/* Left: Agent Status (Mission Control) */}
          <div className="col-span-3 flex flex-col gap-6 overflow-hidden">
            <div className="flex-1 bg-panel border border-border rounded-xl overflow-hidden flex flex-col relative shadow-sm">
              <AgentStatus agentStates={agentStates} events={events} />
            </div>
          </div>

          {/* Center: Candidates (Main Interface) */}
          <div className="col-span-6 bg-panel border border-border rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface/30">
              <h2 className="font-semibold text-white">Candidate Candidates</h2>
              <span className="text-xs text-muted-foreground font-mono">{candidates.length} FOUND</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <CandidateGrid candidates={candidates} />
            </div>
            {candidates.length > 0 && (
              <div className="p-4 border-t border-border bg-surface/30">
                <button
                  onClick={handleFindMore}
                  disabled={isLoading || agentStates.hunter === 'active'}
                  className="w-full px-4 py-3 text-sm font-medium text-white bg-accent-blue hover:bg-accent-blue/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading || agentStates.hunter === 'active' ? 'Searching...' : '🔍 Find More Candidates'}
                </button>
              </div>
            )}
          </div>

          {/* Right: Metrics (Data Viz) */}
          <div className="col-span-3 flex flex-col gap-6">
            <div className=" bg-panel border border-border rounded-xl p-6 shadow-sm">
              <MetricsPanel metrics={metrics} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



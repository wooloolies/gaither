'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGetJobApiJobsJobIdGet, useStartJobApiJobsJobIdStartPost } from '@/lib/api/jobs/jobs'
import { useListCandidatesApiCandidatesGet } from '@/lib/api/candidates/candidates'
import { useAgentStore } from '@/store/agent-store'
import Dashboard from '@/components/dashboard'

interface HireJobPageProps {
  params: Promise<{ jobId: string }>
}

export default function HireJobPage({ params }: HireJobPageProps) {
  const { jobId } = use(params)
  const router = useRouter()
  const { setSelectedModel, addCandidate, candidates: storeCandidates } = useAgentStore()
  const [isJobStarted, setIsJobStarted] = useState(false)

  // Fetch job from server to ensure it exists and user has access
  const { data: job, isLoading, isError, error } = useGetJobApiJobsJobIdGet(jobId)

  // Fetch existing candidates for this job
  const { data: existingCandidates } = useListCandidatesApiCandidatesGet(
    { job_id: jobId },
    { query: { enabled: !!jobId } }
  )

  // Load existing candidates into the store when fetched
  useEffect(() => {
    if (existingCandidates && existingCandidates.length > 0 && storeCandidates.length === 0) {
      existingCandidates.forEach((candidate) => {
        addCandidate({
          id: candidate.id,
          username: candidate.username,
          avatar: candidate.avatar_url ?? null,
          profile_url: candidate.profile_url ?? null,
          score: candidate.analysis?.fit_score ?? null,
          skills: candidate.analysis?.skills ?? [],
          strengths: candidate.analysis?.strengths ?? [],
        })
      })
    }
  }, [existingCandidates, storeCandidates.length, addCandidate])

  // Start job mutation
  const startJobMutation = useStartJobApiJobsJobIdStartPost({
    mutation: {
      onSuccess: () => {
        setIsJobStarted(true)
      },
      onError: (error) => {
        console.error('Error starting job:', error)
        alert('Error starting job. Please try again.')
      },
    },
  })

  // Set model and start job when job is loaded
  useEffect(() => {
    if (job && !startJobMutation.isPending && !startJobMutation.isSuccess && !isJobStarted) {
      setSelectedModel(job.model_provider || 'gemini')
      startJobMutation.mutate({ jobId: job.id })
    }
  }, [job, setSelectedModel, startJobMutation.isPending, startJobMutation.isSuccess, startJobMutation.mutate, isJobStarted])

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading job...</p>
        </div>
      </div>
    )
  }

  // Handle error state (404, unauthorized, etc.)
  if (isError || !job) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Job Not Found</h1>
          <p className="text-muted-foreground mb-4">
            {error ? 'Unable to load job. Please check if you have access.' : 'Job not found or you do not have access to this job.'}
          </p>
          <button
            onClick={() => router.push('/hire')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Create Job
          </button>
        </div>
      </div>
    )
  }

  // Show loading state while starting job
  if (startJobMutation.isPending) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Starting job...</p>
        </div>
      </div>
    )
  }

  // Show Dashboard with job started
  return <Dashboard initialJobId={jobId} />
}

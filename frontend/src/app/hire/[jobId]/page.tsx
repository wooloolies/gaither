'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useGetJobApiJobsJobIdGet, useStartJobApiJobsJobIdStartPost } from '@/lib/api/jobs/jobs'
import { useListCandidatesApiCandidatesGet } from '@/lib/api/candidates/candidates'
import { useAgentStore } from '@/store/agent-store'
import { JobStatus } from '@/lib/api/model'
import Dashboard from '@/components/dashboard'

interface HireJobPageProps {
  params: Promise<{ jobId: string }>
}

export default function HireJobPage({ params }: HireJobPageProps) {
  const { jobId } = use(params)
  const router = useRouter()
  const { setSelectedModel, setCurrentJob, addCandidate, candidates: storeCandidates, reset, currentJob } = useAgentStore()
  const [isJobStarted, setIsJobStarted] = useState(false)

  // Reset store when navigating to a different job
  useEffect(() => {
    // If we have a different job loaded, reset the store first
    if (currentJob && String(currentJob.id) !== jobId) {
      reset()
    }
  }, [jobId, currentJob, reset])

  // Fetch job from server to ensure it exists and user has access
  const { data: job, isLoading, isError, error } = useGetJobApiJobsJobIdGet(jobId)

  // Fetch existing candidates for this job
  const { data: existingCandidates } = useListCandidatesApiCandidatesGet(
    { job_id: jobId },
    { query: { enabled: !!jobId } }
  )

  // Set current job and load existing candidates when job data is fetched
  useEffect(() => {
    if (job && (!currentJob || String(currentJob.id) !== job.id)) {
      // Set the current job in store
      setCurrentJob({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        location: job.location ?? undefined,
        description: job.description,
        model_provider: job.model_provider ?? undefined,
      })
    }
  }, [job, currentJob, setCurrentJob])

  // Load existing candidates into the store when fetched (only if store is empty for this job)
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
        toast.error('Error starting job. Please try again.')
      },
    },
  })

  // Set model and start job when job is loaded
  useEffect(() => {
    if (job && !startJobMutation.isPending && !startJobMutation.isSuccess && !isJobStarted) {
      setSelectedModel(job.model_provider || 'gemini')

      // Only start the job if it's not already running
      if (job.status !== JobStatus.running && job.status !== JobStatus.completed) {
        startJobMutation.mutate({ jobId: job.id })
      } else {
        // If job is already running or completed, mark as started
        setIsJobStarted(true)
      }
    }
  }, [job, setSelectedModel, startJobMutation.isPending, startJobMutation.isSuccess, startJobMutation.mutate, isJobStarted])

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#3c3c3c] transition-colors duration-500 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="font-stzhongsong text-xl text-black dark:text-white">Loading job...</p>
        </div>
      </div>
    )
  }

  // Handle error state (404, unauthorized, etc.)
  if (isError || !job) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#3c3c3c] transition-colors duration-500 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="font-pixelify text-3xl md:text-4xl text-black dark:text-white mb-6">Job Not Found</h1>
          <p className="font-stzhongsong text-lg text-black/70 dark:text-white/70 mb-8">
            {error ? 'Unable to load job. Please check if you have access.' : 'Job not found or you do not have access to this job.'}
          </p>
          <button
            onClick={() => router.push('/hire')}
            className="font-stzhongsong text-xl px-8 py-4 rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-500 bg-[#222] hover:bg-[#333] text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black cursor-pointer"
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
      <div className="min-h-screen bg-white dark:bg-[#3c3c3c] transition-colors duration-500 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="font-stzhongsong text-xl text-black dark:text-white">Starting job...</p>
        </div>
      </div>
    )
  }

  // Show Dashboard with job started
  return <Dashboard initialJobId={jobId} />
}

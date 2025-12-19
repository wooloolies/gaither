import CandidateCard from '@/components/dashboard/candidate-card'
import type { Candidate } from '@/store/agent-store'

interface CandidateGridProps {
  candidates: Candidate[]
  jobId?: string | number | null
}

export default function CandidateGrid({ candidates, jobId }: CandidateGridProps) {
  if (candidates.length === 0) {
    return (
      <div className="bg-white dark:bg-surface rounded-2xl p-16 text-center border border-border">
        <div className="text-7xl mb-6">🔍</div>
        <h3 className="text-2xl font-bold text-foreground mb-3">Finding Candidates</h3>
        <p className="text-muted-foreground text-lg">
          The Hunter agent is searching for qualified candidates.<br/>Results will appear here soon.
        </p>
      </div>
    )
  }

  // Sort candidates by score in descending order
  const sortedCandidates = [...candidates].sort((a, b) => {
    const scoreA = a.score ?? 0
    const scoreB = b.score ?? 0
    return scoreB - scoreA
  })

  return (
    <div>
      <div className="space-y-6">
        {sortedCandidates.map((candidate, index) => (
          <CandidateCard key={candidate.id} candidate={candidate} index={index} jobId={jobId} />
        ))}
      </div>
    </div>
  )
}

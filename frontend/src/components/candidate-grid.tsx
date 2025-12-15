import CandidateCard from '@/components/dashboard/candidate-card'
import type { Candidate } from '@/store/agent-store'

interface CandidateGridProps {
  candidates: Candidate[]
}

export default function CandidateGrid({ candidates }: CandidateGridProps) {
  if (candidates.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-2xl font-bold text-white mb-2">Finding Candidates...</h3>
        <p className="text-slate-400">
          The Hunter agent is searching for qualified candidates. Results will appear here.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-4">
        {candidates.map((candidate, index) => (
          <CandidateCard key={candidate.id} candidate={candidate} index={index} />
        ))}
      </div>
    </div>
  )
}

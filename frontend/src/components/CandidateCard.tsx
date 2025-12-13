import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import type { Candidate } from '@/store/agentStore'

interface CandidateCardProps {
  candidate: Candidate
  index: number
}

const scoreColor = (score: number) => {
  if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (score >= 70) return 'text-blue-400 border-blue-500/30 bg-blue-500/10'
  if (score >= 60) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
  return 'text-red-400 border-red-500/30 bg-red-500/10'
}

export default function CandidateCard({ candidate, index }: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-surface border border-border rounded-lg p-5 hover:border-border-high transition-all"
    >
      <div className="flex items-start gap-5">
        {/* Avatar / Initials */}
        <div className="w-12 h-12 rounded-lg bg-panel border border-border flex items-center justify-center shrink-0 text-lg font-bold text-secondary">
          {candidate.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.avatar} alt={candidate.username} className="w-full h-full rounded-lg object-cover" />
          ) : (
            candidate.username?.[0]?.toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-white text-lg truncate">{candidate.username}</h3>
            {typeof candidate.score === 'number' && (
              <div className={`px-2 py-0.5 rounded text-xs font-mono border ${scoreColor(candidate.score)}`}>
                {candidate.score} FIT
              </div>
            )}
          </div>

          {candidate.profile_url && (
            <a
              href={candidate.profile_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-accent-blue hover:text-blue-300 hover:underline mb-3 inline-block"
            >
              View GitHub Profile ↗
            </a>
          )}

          {/* Skills */}
          <div className="flex flex-wrap gap-2 mb-3">
            {candidate.skills?.slice(0, 5).map((skill, i) => (
              <span key={skill ?? i} className="px-2 py-0.5 bg-panel border border-border rounded text-[10px] text-secondary">
                {skill}
              </span>
            ))}
          </div>

          {/* Key Strengths */}
          {candidate.strengths && candidate.strengths.length > 0 && (
            <div className="space-y-1 mt-3">
              {candidate.strengths.slice(0, 2).map((s, i) => (
                <div key={s ?? i} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-emerald-500">✓</span> {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-secondary hover:text-white transition-colors">
          {expanded ? 'Hide Details' : 'View Generated Message'}
        </button>
        <button className="text-xs font-medium bg-white text-black px-3 py-1.5 rounded hover:bg-gray-200 transition-colors">
          Contact Candidate
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 bg-black/30 rounded border border-border/50 font-mono text-xs text-gray-300 whitespace-pre-wrap">
              Subject: Opportunity at...
              {'\n\n'}
              Hi {candidate.username}, I noticed your work on...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

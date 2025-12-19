"use client"

import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import type { Candidate } from '@/store/agent-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import CandidateGraph from '@/features/neo4j/components/candidate-graph'
import { CandidateChatModal } from '@/components/chat'

interface CandidateCardProps {
  candidate: Candidate
  index: number
  jobId?: string | number | null
}

const scoreColor = (score: number) => {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (score >= 70) return 'text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
  return 'text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10'
}

export default function CandidateCard({ candidate, index, jobId }: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showGraph, setShowGraph] = useState(false)
  const [showChat, setShowChat] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white dark:bg-surface border border-border rounded-2xl p-6 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-5">
        {/* Avatar / Initials */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 border border-border flex items-center justify-center shrink-0 text-xl font-bold text-foreground">
          {candidate.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.avatar} alt={candidate.username} className="w-full h-full rounded-xl object-cover" />
          ) : (
            candidate.username?.[0]?.toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground text-lg truncate">{candidate.username}</h3>
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
              <span key={skill ?? i} className="px-3 py-1 bg-accent-blue/10 border border-accent-blue/20 rounded-lg text-xs text-accent-blue font-medium">
                {skill}
              </span>
            ))}
          </div>

          {/* Key Strengths */}
          {candidate.strengths && candidate.strengths.length > 0 && (
            <div className="space-y-1 mt-3">
              {candidate.strengths.slice(0, 2).map((s, i) => (
                <div key={s ?? i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-emerald-600 dark:text-emerald-500">✓</span> {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-border flex items-center justify-between">
        <button onClick={() => setExpanded(!expanded)} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          {expanded ? '↑ Hide Details' : '↓ View Message'}
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => setShowGraph(true)}
            className="text-sm font-medium bg-white dark:bg-accent-blue/10 text-accent-blue border border-accent-blue/30 px-4 py-2 rounded-xl hover:shadow-md transition-all"
          >
            View Graph
          </button>
          {jobId && (
            <button
              onClick={() => setShowChat(true)}
              className="text-sm font-medium bg-white dark:bg-accent-purple/10 text-accent-purple border border-accent-purple/30 px-4 py-2 rounded-xl hover:shadow-md transition-all"
            >
              Chat with AI
            </button>
          )}
          <button className="text-sm font-medium bg-accent-blue text-white px-4 py-2 rounded-xl hover:bg-accent-blue/90 hover:shadow-md transition-all">
            Contact
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 p-5 bg-surface/30 dark:bg-surface/50 rounded-xl border border-border text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              <strong className="text-foreground">Subject:</strong> Opportunity at...
              {'\n\n'}
              Hi {candidate.username}, I noticed your work on...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showGraph} onOpenChange={setShowGraph}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{candidate.username}&apos;s Network Graph</DialogTitle>
            <DialogDescription>
              Explore {candidate.username}&apos;s repository connections and relationships
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden" style={{ height: 'calc(90vh - 120px)' }}>
            <CandidateGraph username={candidate.username} height={700} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal - Only render when opened to avoid premature API calls */}
      {jobId && showChat && (
        <CandidateChatModal
          candidate={candidate}
          jobId={String(jobId)}
          open={showChat}
          onOpenChange={setShowChat}
        />
      )}
    </motion.div>
  )
}


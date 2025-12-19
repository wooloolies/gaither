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
import axios from 'axios'

interface CandidateCardProps {
  candidate: Candidate
  index: number
  jobId?: string | number | null
}

interface OutreachMessage {
  subject: string
  body: string
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
  const [message, setMessage] = useState<OutreachMessage | null>(null)
  const [generatingMessage, setGeneratingMessage] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)

  const handleGenerateMessage = async () => {
    if (message) {
      // Message already generated, just expand
      setExpanded(true)
      return
    }

    setGeneratingMessage(true)
    setMessageError(null)

    try {
      const response = await axios.post(`http://localhost:8000/api/candidates/${candidate.id}/generate-message`)
      setMessage(response.data)
      setExpanded(true)
    } catch (error: any) {
      console.error('Error generating message:', error)
      setMessageError(error.response?.data?.detail || 'Failed to generate message')
    } finally {
      setGeneratingMessage(false)
    }
  }

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
        <button
          onClick={() => message && setExpanded(!expanded)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium disabled:opacity-50"
          disabled={!message}
        >
          {expanded ? '↑ Hide Message' : message ? '↓ View Message' : 'No message yet'}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGraph(true)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-accent-blue/50 px-4 py-2 rounded-xl hover:bg-accent-blue/5 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
            Graph
          </button>
          {jobId && (
            <button
              onClick={() => setShowChat(true)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-accent-purple/50 px-4 py-2 rounded-xl hover:bg-accent-purple/5 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              Chat
            </button>
          )}
          <button
            onClick={handleGenerateMessage}
            disabled={generatingMessage}
            className={`text-sm font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              message 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20' 
                : 'bg-accent-blue/10 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/20'
            }`}
          >
            {generatingMessage ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : message ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Message Ready
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Generate Message
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && message && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 p-5 bg-surface/30 dark:bg-surface/50 rounded-xl border border-border text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              <strong className="text-foreground">Subject:</strong> {message.subject}
              {'\n\n'}
              {message.body}
            </div>
          </motion.div>
        )}
        {messageError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              <strong>Error:</strong> {messageError}
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


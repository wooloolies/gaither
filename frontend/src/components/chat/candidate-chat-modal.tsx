"use client"

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useCandidateChat } from '@/hooks/useCandidateChat'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import type { Candidate } from '@/store/agent-store'

interface CandidateChatModalProps {
  candidate: Candidate
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal dialog for AI-powered candidate chat.
 * Uses Dialog from shadcn/ui (same pattern as View Graph modal).
 */
export function CandidateChatModal({
  candidate,
  jobId,
  open,
  onOpenChange,
}: CandidateChatModalProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    clearHistory,
    clearError,
    loadSession,
  } = useCandidateChat({
    candidateId: candidate.id,
    jobId,
    autoCreateSession: false, // Don't auto-load, we'll load when modal opens
  })

  /**
   * Load chat session when modal opens
   */
  useEffect(() => {
    if (open) {
      loadSession()
    }
  }, [open, loadSession])

  /**
   * Handle clear history with confirmation
   */
  const handleClearHistory = async () => {
    if (messages.length === 0) return
    
    if (window.confirm('Are you sure you want to clear all chat history with this candidate? This cannot be undone.')) {
      await clearHistory()
    }
  }

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  /**
   * Clear error when modal closes
   */
  useEffect(() => {
    if (!open) {
      clearError()
    }
  }, [open, clearError])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 border border-border flex items-center justify-center flex-shrink-0">
                {candidate.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={candidate.avatar}
                    alt={candidate.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-foreground">
                    {candidate.username?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Chat about {candidate.username}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Ask AI questions about this candidate&apos;s skills, repositories, and fit
                </DialogDescription>
              </div>
            </div>
            
            {/* Clear History Button */}
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                disabled={loading || sending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear chat history"
              >
                <TrashIcon />
                Clear
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-background/50">
          {/* Loading state */}
          {loading && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LoadingSpinner />
                <p className="text-sm text-muted-foreground mt-2">Loading chat...</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-accent-purple/10 flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="font-medium text-foreground mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask questions about {candidate.username}&apos;s skills, experience, 
                repositories, or get interview question suggestions.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <SuggestionChip
                  text="Compare to job requirements"
                  onClick={() => sendMessage("How does this candidate compare to the job requirements?")}
                  disabled={sending}
                />
                <SuggestionChip
                  text="Analyze GitHub activity"
                  onClick={() => sendMessage("Can you analyze this candidate's recent GitHub activity?")}
                  disabled={sending}
                />
                <SuggestionChip
                  text="Generate interview questions"
                  onClick={() => sendMessage("Generate some interview questions for this candidate.")}
                  disabled={sending}
                />
                <SuggestionChip
                  text="🌐 Search latest tech trends"
                  onClick={() => sendMessage("Search the web for the latest trends and best practices related to this candidate's main skills.")}
                  disabled={sending}
                />
              </div>
            </div>
          )}

          {/* Messages list */}
          <AnimatePresence>
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLatest={index === messages.length - 1}
              />
            ))}
          </AnimatePresence>

          {/* Sending indicator */}
          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start mb-4"
            >
              <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <LoadingDots />
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mb-4"
            >
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                <span className="text-sm text-red-500">{error}</span>
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-600 ml-2"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <ChatInput
          onSend={sendMessage}
          disabled={sending}
          placeholder={`Ask about ${candidate.username}...`}
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Quick suggestion chip button
 */
function SuggestionChip({
  text,
  onClick,
  disabled,
}: {
  text: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-xs bg-accent-purple/10 border border-accent-purple/20 rounded-full text-accent-purple hover:bg-accent-purple/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {text}
    </button>
  )
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
  )
}

/**
 * Animated loading dots
 */
function LoadingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-accent-purple rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Trash icon SVG
 */
function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default CandidateChatModal




"use client"

import { useState, useCallback, useEffect } from 'react'
import { chatApi, ChatMessageResponse, ChatSessionResponse, ToolCallSchema } from '@/lib/api-client'

export interface UseCandidateChatOptions {
  candidateId: string
  jobId: string
  autoCreateSession?: boolean
}

export interface UseCandidateChatReturn {
  messages: ChatMessageResponse[]
  loading: boolean
  sending: boolean
  error: string | null
  sessionId: string | null
  toolCalls: ToolCallSchema[]
  sendMessage: (content: string) => Promise<void>
  loadSession: () => Promise<void>
  createSession: () => Promise<void>
  clearHistory: () => Promise<void>
  clearError: () => void
}

/**
 * Custom hook for managing candidate chat state.
 * Handles session creation, message sending, and conversation history.
 */
export function useCandidateChat({
  candidateId,
  jobId,
  autoCreateSession = true,
}: UseCandidateChatOptions): UseCandidateChatReturn {
  const [messages, setMessages] = useState<ChatMessageResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [toolCalls, setToolCalls] = useState<ToolCallSchema[]>([])

  /**
   * Load existing session for the candidate
   */
  const loadSession = useCallback(async () => {
    if (!candidateId) return

    setLoading(true)
    setError(null)

    try {
      const session = await chatApi.getCandidateSession(candidateId)
      setSessionId(session.id)
      setMessages(session.messages)
    } catch (err) {
      // 404 means no session exists - this is fine
      if ((err as { response?: { status: number } })?.response?.status !== 404) {
        console.error('Failed to load chat session:', err)
        setError('Failed to load chat history')
      }
    } finally {
      setLoading(false)
    }
  }, [candidateId])

  /**
   * Create a new chat session
   */
  const createSession = useCallback(async () => {
    if (!candidateId || !jobId) return

    setLoading(true)
    setError(null)

    try {
      const session = await chatApi.createSession(candidateId, jobId)
      setSessionId(session.id)
      setMessages([])
    } catch (err) {
      console.error('Failed to create chat session:', err)
      setError('Failed to start chat session')
    } finally {
      setLoading(false)
    }
  }, [candidateId, jobId])

  /**
   * Send a message and receive AI response
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    // If no session exists, create one first
    let currentSessionId = sessionId
    if (!currentSessionId) {
      try {
        setLoading(true)
        const session = await chatApi.createSession(candidateId, jobId)
        currentSessionId = session.id
        setSessionId(session.id)
        setLoading(false)
      } catch (err) {
        console.error('Failed to create chat session:', err)
        setError('Failed to start chat session')
        setLoading(false)
        return
      }
    }

    // Add optimistic user message
    const userMessage: ChatMessageResponse = {
      id: `temp-${Date.now()}`,
      session_id: currentSessionId,
      role: 'user',
      content: content.trim(),
      tool_calls: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    setSending(true)
    setError(null)
    setToolCalls([])

    try {
      const response = await chatApi.sendMessage(currentSessionId, content.trim())

      // Replace optimistic message with real user message and add assistant response
      setMessages((prev) => {
        // Remove the temp user message
        const withoutTemp = prev.filter((m) => m.id !== userMessage.id)
        
        // Add the real user message (from the response context, or reconstruct)
        const realUserMessage: ChatMessageResponse = {
          ...userMessage,
          id: `user-${Date.now()}`, // We don't get the user message ID back, so generate one
        }
        
        return [...withoutTemp, realUserMessage, response.message]
      })

      // Track tool calls for display
      if (response.tool_calls.length > 0) {
        setToolCalls(response.tool_calls)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setError('Failed to send message. Please try again.')
      
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
    } finally {
      setSending(false)
    }
  }, [sessionId, candidateId, jobId])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Clear all chat history for this candidate
   */
  const clearHistory = useCallback(async () => {
    if (!candidateId) return

    setLoading(true)
    setError(null)

    try {
      await chatApi.clearCandidateHistory(candidateId)
      // Reset local state
      setMessages([])
      setSessionId(null)
      setToolCalls([])
    } catch (err) {
      console.error('Failed to clear chat history:', err)
      setError('Failed to clear chat history')
    } finally {
      setLoading(false)
    }
  }, [candidateId])

  /**
   * Auto-load session on mount if enabled
   */
  useEffect(() => {
    if (autoCreateSession && candidateId) {
      loadSession()
    }
  }, [autoCreateSession, candidateId, loadSession])

  return {
    messages,
    loading,
    sending,
    error,
    sessionId,
    toolCalls,
    sendMessage,
    loadSession,
    createSession,
    clearHistory,
    clearError,
  }
}

export default useCandidateChat




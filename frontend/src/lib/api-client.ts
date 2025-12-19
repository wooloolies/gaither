import axios from 'axios'
import type { Candidate, Job } from '@/store/agent-store'

export interface JobRequest {
  title: string
  description: string
  company_name: string
  location?: string
  model_provider?: string
  requirements?: string[]
  company_highlights?: string[]
  // Additional fields for recruiter form
  recruiter_name?: string
  language_requirement?: string
  key_responsibilities?: string
  core_skill_requirement?: string
  familiar_with?: string
  work_type?: string
  years_of_experience?: number
  minimum_required_degree?: string
  grade?: number
}

export interface JobResponse extends JobRequest {
  id: string | number
}

export interface JobStartResponse {
  message: string
  job_id: string
  status: string
}

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatAskRequest {
  messages: ChatMessage[]
}

export interface ChatAskResponse {
  answer: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const jobsApi = {
  create: async (jobData: JobRequest): Promise<JobResponse> => {
    const response = await apiClient.post<JobResponse>('/api/jobs', jobData)
    return response.data
  },

  get: async (jobId: Job['id']): Promise<JobResponse> => {
    const response = await apiClient.get<JobResponse>(`/api/jobs/${jobId}`)
    return response.data
  },

  list: async (): Promise<JobResponse[]> => {
    const response = await apiClient.get<JobResponse[]>('/api/jobs')
    return response.data
  },

  start: async (jobId: Job['id']): Promise<JobResponse> => {
    const response = await apiClient.post<JobResponse>(`/api/jobs/${jobId}/start`)
    return response.data
  },

  findMore: async (jobId: Job['id']): Promise<JobResponse> => {
    const response = await apiClient.post<JobResponse>(`/api/jobs/${jobId}/find-more`)
    return response.data
  },
}

export const candidatesApi = {
  list: async (jobId: Job['id'] | null = null): Promise<Candidate[]> => {
    const params = jobId ? { job_id: jobId } : {}
    const response = await apiClient.get<Candidate[]>('/api/candidates', { params })
    return response.data
  },

  get: async (candidateId: string): Promise<Candidate> => {
    const response = await apiClient.get<Candidate>(`/api/candidates/${candidateId}`)
    return response.data
  },

  getMessage: async (candidateId: string): Promise<{ message: string }> => {
    const response = await apiClient.get<{ message: string }>(`/api/candidates/${candidateId}/message`)
    return response.data
  },
}

// Chat API Types
export interface ToolCallSchema {
  tool: string
  arguments: Record<string, unknown>
  result: Record<string, unknown>
}

export interface ChatMessageResponse {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls?: ToolCallSchema[] | null
  created_at: string
}

export interface ChatSessionResponse {
  id: string
  candidate_id: string
  job_id: string
  model_provider: string
  created_at: string
  updated_at: string
  messages: ChatMessageResponse[]
}

export interface SendMessageResponse {
  message: ChatMessageResponse
  tool_calls: ToolCallSchema[]
}

export const chatApi = {
  /**
   * Create a new chat session for a candidate
   */
  createSession: async (candidateId: string, jobId: string): Promise<ChatSessionResponse> => {
    const response = await apiClient.post<ChatSessionResponse>('/api/chat/sessions', {
      candidate_id: candidateId,
      job_id: jobId,
    })
    return response.data
  },

  /**
   * Get a chat session by ID
   */
  getSession: async (sessionId: string): Promise<ChatSessionResponse> => {
    const response = await apiClient.get<ChatSessionResponse>(`/api/chat/sessions/${sessionId}`)
    return response.data
  },

  /**
   * Get the latest chat session for a candidate
   */
  getCandidateSession: async (candidateId: string, latest = true): Promise<ChatSessionResponse> => {
    const response = await apiClient.get<ChatSessionResponse>(
      `/api/chat/sessions/by-candidate/${candidateId}`,
      { params: { latest } }
    )
    return response.data
  },

  /**
   * Send a message and get AI response
   */
  sendMessage: async (sessionId: string, content: string): Promise<SendMessageResponse> => {
    const response = await apiClient.post<SendMessageResponse>(
      `/api/chat/sessions/${sessionId}/messages`,
      { content }
    )
    return response.data
  },

  /**
   * Delete a chat session
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/api/chat/sessions/${sessionId}`)
  },

  /**
   * Clear all chat history for a candidate (deletes all sessions)
   */
  clearCandidateHistory: async (candidateId: string): Promise<{ sessions_deleted: number }> => {
    const response = await apiClient.delete<{ message: string; candidate_id: string; sessions_deleted: number }>(
      `/api/chat/candidates/${candidateId}/history`
    )
    return response.data
  },

  /**
   * Clear all messages from a session but keep the session
   */
  clearSessionMessages: async (sessionId: string): Promise<{ messages_deleted: number }> => {
    const response = await apiClient.delete<{ message: string; session_id: string; messages_deleted: number }>(
      `/api/chat/sessions/${sessionId}/messages`
    )
    return response.data
  },
}

export default apiClient

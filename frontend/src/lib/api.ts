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

const API_BASE_URL = 'http://localhost:8000'

const apiClient = axios.create({
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

export default apiClient



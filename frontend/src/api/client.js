import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Job API
export const jobsApi = {
  create: async (jobData) => {
    const response = await apiClient.post('/api/jobs', jobData)
    return response.data
  },

  get: async (jobId) => {
    const response = await apiClient.get(`/api/jobs/${jobId}`)
    return response.data
  },

  list: async () => {
    const response = await apiClient.get('/api/jobs')
    return response.data
  },

  start: async (jobId) => {
    const response = await apiClient.post(`/api/jobs/${jobId}/start`)
    return response.data
  }
}

// Candidates API
export const candidatesApi = {
  list: async (jobId = null) => {
    const params = jobId ? { job_id: jobId } : {}
    const response = await apiClient.get('/api/candidates', { params })
    return response.data
  },

  get: async (candidateId) => {
    const response = await apiClient.get(`/api/candidates/${candidateId}`)
    return response.data
  },

  getMessage: async (candidateId) => {
    const response = await apiClient.get(`/api/candidates/${candidateId}/message`)
    return response.data
  }
}

export default apiClient

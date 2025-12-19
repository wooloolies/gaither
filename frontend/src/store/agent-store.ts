import { create } from 'zustand'

export type AgentStatus = 'idle' | 'active' | 'completed'

export interface AgentStates {
  hunter: AgentStatus
  analyzer: AgentStatus
  engager: AgentStatus
}

export interface Candidate {
  id: string
  username: string
  avatar?: string | null
  profile_url?: string | null
  score?: number | null
  skills?: string[]
  strengths?: string[]
}

export interface Metrics {
  totalFound: number
  averageScore: number
  messagesGenerated: number
  timeElapsed: number
}

export interface PipelineEventData {
  candidate_id?: string
  username?: string
  avatar_url?: string
  profile_url?: string
  fit_score?: number
  skills?: string[]
  strengths?: string[]
  message?: string
  [key: string]: unknown
}

export interface WebSocketEvent {
  event: string
  timestamp?: string | number
  data?: PipelineEventData
}

export interface Job {
  id: string | number
  title?: string
  company_name?: string
  location?: string
  description?: string
  model_provider?: string
}

interface AgentStoreState {
  agentStates: AgentStates
  candidates: Candidate[]
  events: WebSocketEvent[]
  metrics: Metrics
  currentJob: Job | null
  selectedModel: string
  setSelectedModel: (model: string) => void
  setCurrentJob: (job: Job) => void
  setAgentState: (agent: keyof AgentStates, state: AgentStatus) => void
  addCandidate: (candidate: Candidate) => void
  updateCandidate: (candidateId: string, updates: Partial<Candidate>) => void
  addEvent: (event: WebSocketEvent) => void
  incrementMessagesGenerated: () => void
  updateTimeElapsed: (seconds: number) => void
  reset: () => void
  handleWebSocketEvent: (event: WebSocketEvent) => void
}

const initialAgentStates: AgentStates = {
  hunter: 'idle',
  analyzer: 'idle',
  engager: 'idle',
}

const initialMetrics: Metrics = {
  totalFound: 0,
  averageScore: 0,
  messagesGenerated: 0,
  timeElapsed: 0,
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  agentStates: initialAgentStates,
  candidates: [],
  events: [],
  metrics: initialMetrics,
  currentJob: null,
  selectedModel: 'gemini', // Default model

  setSelectedModel: (model) => set({ selectedModel: model }),

  setCurrentJob: (job) => set({ currentJob: job }),

  setAgentState: (agent, state) =>
    set((store) => ({
      agentStates: {
        ...store.agentStates,
        [agent]: state,
      },
    })),

  addCandidate: (candidate) =>
    set((store) => {
      const candidates = [...store.candidates, candidate]
      const scores = candidates
        .filter((c) => typeof c.score === 'number' && c.score !== null)
        .map((c) => c.score as number)

      const averageScore =
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

      return {
        candidates,
        metrics: {
          ...store.metrics,
          totalFound: candidates.length,
          averageScore,
        },
      }
    }),

  updateCandidate: (candidateId, updates) =>
    set((store) => ({
      candidates: store.candidates.map((c) => (c.id === candidateId ? { ...c, ...updates } : c)),
    })),

  addEvent: (event) =>
    set((store) => ({
      events: [event, ...store.events].slice(0, 100),
    })),

  incrementMessagesGenerated: () =>
    set((store) => ({
      metrics: {
        ...store.metrics,
        messagesGenerated: store.metrics.messagesGenerated + 1,
      },
    })),

  updateTimeElapsed: (seconds) =>
    set((store) => ({
      metrics: {
        ...store.metrics,
        timeElapsed: seconds,
      },
    })),

  reset: () =>
    set({
      agentStates: initialAgentStates,
      candidates: [],
      events: [],
      metrics: initialMetrics,
      currentJob: null,
      selectedModel: 'gemini',
    }),

  handleWebSocketEvent: (event) =>
    set((store) => {
      const events = [event, ...store.events].slice(0, 100)
      let agentStates = store.agentStates
      let candidates = store.candidates
      let metrics = store.metrics

      if (event.event.startsWith('hunter.')) {
        if (event.event === 'hunter.search_started') {
          agentStates = { ...agentStates, hunter: 'active' }
        } else if (event.event === 'hunter.search_completed') {
          agentStates = { ...agentStates, hunter: 'completed' }
        }
      }

      if (event.event.startsWith('analyzer.')) {
        if (event.event === 'analyzer.started') {
          agentStates = { ...agentStates, analyzer: 'active' }
        } else if (event.event === 'analyzer.completed') {
          agentStates = { ...agentStates, analyzer: 'active' }

          const candidateId = event.data?.candidate_id
          if (candidateId) {
            const candidateData: Candidate = {
              id: candidateId,
              username: event.data?.username ?? 'Unknown',
              avatar: event.data?.avatar_url ?? null,
              profile_url: event.data?.profile_url ?? null,
              score: event.data?.fit_score ?? null,
              skills: event.data?.skills ?? [],
              strengths: event.data?.strengths ?? [],
            }

            const existingIndex = candidates.findIndex((c) => c.id === candidateData.id)

            if (existingIndex >= 0) {
              const updatedCandidates = [...candidates]
              updatedCandidates[existingIndex] = { ...updatedCandidates[existingIndex], ...candidateData }
              candidates = updatedCandidates
            } else {
              candidates = [...candidates, candidateData]
            }

            const scores = candidates
              .filter((c) => typeof c.score === 'number' && c.score !== null)
              .map((c) => c.score as number)

            metrics = {
              ...metrics,
              totalFound: candidates.length,
              averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
            }
          }
        }
      }

      if (event.event.startsWith('engager.')) {
        if (event.event === 'engager.started') {
          agentStates = { ...agentStates, engager: 'active' }
        } else if (event.event === 'engager.message_generated') {
          metrics = {
            ...metrics,
            messagesGenerated: metrics.messagesGenerated + 1,
          }
        } else if (event.event === 'engager.completed') {
          agentStates = { ...agentStates, engager: 'idle' }
        }
      }

      if (event.event === 'pipeline.completed') {
        agentStates = {
          hunter: 'completed',
          analyzer: 'completed',
          engager: 'idle',  // Engager stays idle (on-demand only)
        }
      }

      return {
        events,
        agentStates,
        candidates,
        metrics,
      }
    }),
}))




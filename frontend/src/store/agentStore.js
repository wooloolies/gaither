import { create } from 'zustand'

export const useAgentStore = create((set) => ({
  // Agent states
  agentStates: {
    hunter: 'idle',    // idle, active, completed
    analyzer: 'idle',
    engager: 'idle'
  },

  // Candidates data
  candidates: [],

  // Event feed
  events: [],

  // Metrics
  metrics: {
    totalFound: 0,
    averageScore: 0,
    messagesGenerated: 0,
    timeElapsed: 0
  },

  // Current job
  currentJob: null,

  // Actions
  setCurrentJob: (job) => set({ currentJob: job }),

  setAgentState: (agent, state) => set((store) => ({
    agentStates: {
      ...store.agentStates,
      [agent]: state
    }
  })),

  addCandidate: (candidate) => set((store) => {
    const newCandidates = [...store.candidates, candidate]

    // Calculate metrics
    const scores = newCandidates
      .filter(c => c.score !== null && c.score !== undefined)
      .map(c => c.score)

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    return {
      candidates: newCandidates,
      metrics: {
        ...store.metrics,
        totalFound: newCandidates.length,
        averageScore
      }
    }
  }),

  updateCandidate: (candidateId, updates) => set((store) => ({
    candidates: store.candidates.map(c =>
      c.id === candidateId ? { ...c, ...updates } : c
    )
  })),

  addEvent: (event) => set((store) => ({
    events: [event, ...store.events].slice(0, 100) // Keep last 100 events
  })),

  incrementMessagesGenerated: () => set((store) => ({
    metrics: {
      ...store.metrics,
      messagesGenerated: store.metrics.messagesGenerated + 1
    }
  })),

  updateTimeElapsed: (seconds) => set((store) => ({
    metrics: {
      ...store.metrics,
      timeElapsed: seconds
    }
  })),

  reset: () => set({
    agentStates: {
      hunter: 'idle',
      analyzer: 'idle',
      engager: 'idle'
    },
    candidates: [],
    events: [],
    metrics: {
      totalFound: 0,
      averageScore: 0,
      messagesGenerated: 0,
      timeElapsed: 0
    },
    currentJob: null
  }),

  // Handle WebSocket events
  handleWebSocketEvent: (event) => set((store) => {
    const newState = { ...store }

    // Add event to feed
    newState.events = [event, ...store.events].slice(0, 100)

    // Handle specific event types
    if (event.event.startsWith('hunter.')) {
      if (event.event === 'hunter.search_started') {
        newState.agentStates = { ...store.agentStates, hunter: 'active' }
      } else if (event.event === 'hunter.search_completed') {
        newState.agentStates = { ...store.agentStates, hunter: 'completed' }
      } else if (event.event === 'hunter.profile_found') {
        // Profile found - will be fully added when analyzer completes
      }
    }

    if (event.event.startsWith('analyzer.')) {
      if (event.event === 'analyzer.started') {
        newState.agentStates = { ...store.agentStates, analyzer: 'active' }
      } else if (event.event === 'analyzer.completed') {
        newState.agentStates = { ...store.agentStates, analyzer: 'active' } // Keep active until all done

        // Add or update candidate
        const candidateData = {
          id: event.data.candidate_id,
          username: event.data.username,
          avatar: event.data.avatar_url,
          profile_url: event.data.profile_url,
          score: event.data.fit_score,
          skills: event.data.skills,
          strengths: event.data.strengths
        }

        const existingIndex = newState.candidates.findIndex(c => c.id === candidateData.id)
        if (existingIndex >= 0) {
          newState.candidates = [...store.candidates]
          newState.candidates[existingIndex] = { ...newState.candidates[existingIndex], ...candidateData }
        } else {
          newState.candidates = [...store.candidates, candidateData]
        }

        // Update metrics
        const scores = newState.candidates
          .filter(c => c.score !== null && c.score !== undefined)
          .map(c => c.score)

        newState.metrics = {
          ...store.metrics,
          totalFound: newState.candidates.length,
          averageScore: scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0
        }
      }
    }

    if (event.event.startsWith('engager.')) {
      if (event.event === 'engager.started') {
        newState.agentStates = { ...store.agentStates, engager: 'active' }
      } else if (event.event === 'engager.message_generated') {
        newState.metrics = {
          ...store.metrics,
          messagesGenerated: store.metrics.messagesGenerated + 1
        }
      }
    }

    if (event.event === 'pipeline.completed') {
      newState.agentStates = {
        hunter: 'completed',
        analyzer: 'completed',
        engager: 'completed'
      }
    }

    return newState
  })
}))

import { useEffect, useRef } from 'react'
import useWebSocket from 'react-use-websocket'
import { useAgentStore } from '../store/agentStore'

export const useAgentWebSocket = (jobId) => {
  const handleWebSocketEvent = useAgentStore(state => state.handleWebSocketEvent)
  const reconnectAttempts = useRef(0)

  const socketUrl = jobId ? `ws://localhost:8000/ws/${jobId}` : null

  const { lastMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => {
      reconnectAttempts.current++
      return reconnectAttempts.current < 5
    },
    reconnectInterval: (attemptNumber) =>
      Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
    share: false,
    onOpen: () => {
      console.log('WebSocket connected')
      reconnectAttempts.current = 0
    },
    onError: (error) => {
      console.error('WebSocket error:', error)
    },
    onClose: () => {
      console.log('WebSocket disconnected')
    }
  }, jobId !== null)

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const event = JSON.parse(lastMessage.data)
        handleWebSocketEvent(event)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
  }, [lastMessage, handleWebSocketEvent])

  // WebSocket status
  const connectionStatus = {
    [0]: 'Connecting',
    [1]: 'Connected',
    [2]: 'Closing',
    [3]: 'Closed'
  }[readyState]

  return {
    isConnected: readyState === 1,
    connectionStatus
  }
}

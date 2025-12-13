import { useEffect, useRef } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { useAgentStore, type WebSocketEvent } from '@/store/agentStore'

export const useAgentWebSocket = (jobId: string | number | null) => {
  const handleWebSocketEvent = useAgentStore((state) => state.handleWebSocketEvent)
  const reconnectAttempts = useRef(0)

  const socketUrl = jobId ? `ws://localhost:8000/ws/${jobId}` : null

  const { lastMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => {
      reconnectAttempts.current += 1
      return reconnectAttempts.current < 5
    },
    reconnectInterval: (attemptNumber) => Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
    share: false,
    onOpen: () => {
      reconnectAttempts.current = 0
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('WebSocket error:', error)
    },
  }, Boolean(jobId))

  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const event = JSON.parse(lastMessage.data as string) as WebSocketEvent
        handleWebSocketEvent(event)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing WebSocket message:', error)
      }
    }
  }, [lastMessage, handleWebSocketEvent])

  const connectionStatusMap: Record<ReadyState, string> = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Connected',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Closed',
  }

  return {
    isConnected: readyState === ReadyState.OPEN,
    connectionStatus: connectionStatusMap[readyState],
  }
}

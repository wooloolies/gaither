import { useWebSocket, ReadyState } from 'ahooks'
import { useAgentStore, type WebSocketEvent } from '@/store/agent-store'

export const useAgentWebSocket = (jobId: string | number | null) => {
  const handleWebSocketEvent = useAgentStore((state) => state.handleWebSocketEvent)

  const socketUrl = jobId ? `ws://localhost:8000/ws/${jobId}` : ''

  const { readyState } = useWebSocket(socketUrl, {
    reconnectLimit: 5,
    reconnectInterval: (attemptNumber) => Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
    manual: !jobId,
    onOpen: () => {
      // Connection opened successfully
    },
    onMessage: (message) => {
      try {
        const event = JSON.parse(message.data as string) as WebSocketEvent
        handleWebSocketEvent(event)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing WebSocket message:', error)
      }
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('WebSocket error:', error)
    },
    onClose: () => {
      // Connection closed
    },
  })

  const connectionStatusMap: Record<ReadyState, string> = {
    [ReadyState.Connecting]: 'Connecting',
    [ReadyState.Open]: 'Connected',
    [ReadyState.Closing]: 'Closing',
    [ReadyState.Closed]: 'Closed',
  }

  return {
    isConnected: readyState === ReadyState.Open,
    connectionStatus: connectionStatusMap[readyState],
  }
}

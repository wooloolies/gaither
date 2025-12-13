import { useWebSocket } from 'ahooks'
import { useAgentStore, type WebSocketEvent } from '@/store/agent-store'

// `ahooks` doesn't re-export `ReadyState` from the top-level entry in all builds,
// so we keep a local enum aligned with WebSocket readyState values.
const ReadyState = {
  Connecting: 0,
  Open: 1,
  Closing: 2,
  Closed: 3,
} as const
type ReadyStateType = (typeof ReadyState)[keyof typeof ReadyState]

export const useAgentWebSocket = (jobId: string | number | null) => {
  const handleWebSocketEvent = useAgentStore((state) => state.handleWebSocketEvent)

  const socketUrl = jobId ? `ws://localhost:8000/ws/${jobId}` : ''

  const { readyState } = useWebSocket(socketUrl, {
    reconnectLimit: 5,
    reconnectInterval: 1000,
    manual: !jobId,
    onOpen: () => {
      // Connection opened successfully
    },
    onMessage: (message: MessageEvent) => {
      try {
        const event = JSON.parse(message.data as string) as WebSocketEvent
        handleWebSocketEvent(event)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing WebSocket message:', error)
      }
    },
    onError: (error: Event) => {
      // eslint-disable-next-line no-console
      console.error('WebSocket error:', error)
    },
    onClose: () => {
      // Connection closed
    },
  })

  const connectionStatusMap: Record<ReadyStateType, string> = {
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

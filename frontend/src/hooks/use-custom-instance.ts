import axios, { type AxiosRequestConfig } from 'axios'

type OrvalPromise<T> = Promise<T> & { cancel?: () => void }

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const useCustomInstance = <T>() => {
  return (config: AxiosRequestConfig, options?: AxiosRequestConfig): OrvalPromise<T> => {
    const controller = new AbortController()

    const upstreamSignals = [config.signal, options?.signal].filter(Boolean) as AbortSignal[]
    for (const signal of upstreamSignals) {
      if (signal.aborted) controller.abort()
      else signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    const promise = apiClient
      .request<T>({
        ...config,
        ...options,
        // Always use our controller so we can expose promise.cancel()
        signal: controller.signal,
      })
      .then((res) => res.data) as OrvalPromise<T>

    promise.cancel = () => controller.abort()

    return promise
  }
}

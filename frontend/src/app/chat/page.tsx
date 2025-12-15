'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { apiClient, type ChatAskResponse, type ChatMessage } from '@/lib/api-client'
import { AgentAvatar, UserAvatar } from '@/components/agent-avatar'

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Ask me about candidates in the database (e.g. “Find ML engineers with PyTorch”).",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await apiClient.post<ChatAskResponse>('/api/chat', { messages: nextMessages })
      setMessages([...nextMessages, { role: 'assistant', content: res.data.answer }])
    } catch (err) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content:
            'Chat is currently unavailable. Make sure WEAVIATE_URL / WEAVIATE_API_KEY / GEMINI_API_KEY are set and the backend is running.',
        },
      ])
      // eslint-disable-next-line no-console
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] bg-white dark:bg-[#3c3c3c] transition-colors duration-500 overflow-hidden">
      {/* Subtle pixel grid background */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      {/* Main container */}
      <div className="relative flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto">
        {/* Header with Agent Character */}
        <div className="px-8 py-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            {/* Agent character in header */}
            <AgentAvatar state={isLoading ? 'thinking' : 'idle'} size={56} />
            <div className="flex-1">
              <h1 className="font-pixelify text-2xl tracking-tight text-black dark:text-white transition-colors duration-500">
                Scout
              </h1>
              <p className="font-stzhongsong text-sm text-black/50 dark:text-white/50">
                {isLoading ? 'Searching candidates...' : 'AI Talent Scout • Ready to help'}
              </p>
            </div>
            {/* Status badge - neo-brutalist style */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-black dark:border-white bg-white dark:bg-[#3c3c3c] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-colors duration-500">
              <div className={`w-2 h-2 ${
                isLoading 
                  ? 'bg-black/40 dark:bg-white/40 animate-pulse' 
                  : 'bg-black dark:bg-white'
              }`} />
              <span className="font-pixelify text-xs text-black dark:text-white">
                {isLoading ? 'Thinking' : 'Online'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">
            {messages.map((m, idx) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {m.role === 'user' ? (
                  <UserAvatar size={40} />
                ) : (
                  <AgentAvatar state="idle" size={40} />
                )}

                {/* Message bubble */}
                <div className={`${m.role === 'user' ? 'max-w-[75%] text-right' : 'flex-1 min-w-0 max-w-[85%]'}`}>
                  {/* Role label */}
                  <div
                    className={`font-pixelify text-xs mb-1.5 ${m.role === 'user'
                      ? 'text-right text-black/50 dark:text-white/50'
                      : 'text-left text-black/50 dark:text-white/50'
                      }`}
                  >
                    {m.role === 'user' ? 'You' : 'Scout'}
                  </div>

                  <div
                    className={`px-5 py-4 transition-colors duration-500 border-2 border-black dark:border-white bg-white dark:bg-[#3c3c3c] text-black dark:text-white text-left ${m.role === 'user'
                      ? 'inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]'
                      : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]'
                      }`}
                  >
                    {m.role === 'user' ? (
                      <p className="font-stzhongsong text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div className="font-stzhongsong text-sm leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="font-pixelify text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="font-pixelify text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="font-stzhongsong text-sm font-bold mb-2 mt-2 first:mt-0">{children}</h3>
                            ),
                            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="space-y-1.5 mb-3 pl-4">{children}</ul>,
                            ol: ({ children }) => <ol className="space-y-1.5 mb-3 pl-4">{children}</ol>,
                            li: ({ children }) => (
                              <li className="relative pl-2 before:content-['▪'] before:absolute before:left-0 before:text-black/40 dark:before:text-white/40">
                                {children}
                              </li>
                            ),
                            code: ({ children, className }) => {
                              const isInline = !className
                              return isInline ? (
                                <code className="bg-black/10 dark:bg-white/15 px-1.5 py-0.5 rounded font-mono text-xs">
                                  {children}
                                </code>
                              ) : (
                                <code className="block bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-3 rounded-lg my-3 text-xs font-mono overflow-x-auto">
                                  {children}
                                </code>
                              )
                            },
                            pre: ({ children }) => <div className="my-3">{children}</div>,
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline font-medium"
                              >
                                {children}
                              </a>
                            ),
                            strong: ({ children }) => <strong className="font-bold text-black dark:text-white">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-black/20 dark:border-white/20 pl-4 py-1 my-3 italic text-black/70 dark:text-white/70">
                                {children}
                              </blockquote>
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                {/* AI Avatar - Thinking state */}
                <AgentAvatar state="thinking" size={40} />
                {/* Typing indicator */}
                <div className="flex-1">
                  <div className="font-pixelify text-xs mb-1.5 text-black/50 dark:text-white/50">Scout</div>
                  <div className="px-5 py-4 border-2 border-black dark:border-white bg-white dark:bg-[#3c3c3c] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] inline-flex items-center gap-3 transition-colors duration-500">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-black dark:bg-white animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 bg-black dark:bg-white animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 bg-black dark:bg-white animate-bounce" />
                    </div>
                    <span className="font-pixelify text-xs text-black/60 dark:text-white/60">Searching...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="px-8 py-6">
          <div className="flex gap-4 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend()
              }}
              placeholder="Ask about candidates... (⌘/Ctrl + Enter to send)"
              className="flex-1 resize-none border-2 border-black dark:border-white bg-white dark:bg-[#3c3c3c] px-5 py-4 text-black dark:text-white font-stzhongsong text-sm outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-colors duration-500 placeholder:text-black/40 dark:placeholder:text-white/40 min-h-[68px] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="h-[68px] px-8 border-2 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-pixelify text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:bg-black/80 dark:hover:bg-white/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200 disabled:bg-black/30 disabled:dark:bg-white/30 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



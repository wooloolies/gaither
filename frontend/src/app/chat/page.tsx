'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { apiClient, type ChatAskResponse, type ChatMessage } from '@/lib/api-client'

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
        {/* Header */}
        <div className="px-8 py-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <h1 className="font-pixelify text-3xl tracking-tight text-black dark:text-white transition-colors duration-500">
                AI Talent Scout
              </h1>
              <p className="font-stzhongsong text-sm text-black/50 dark:text-white/50 mt-1">
                Semantic search • Powered by Weaviate
              </p>
            </div>
            {/* Pixel-style indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10">
              <div className="w-2 h-2 bg-green-500 rounded-sm animate-pulse" />
              <span className="font-stzhongsong text-xs text-black/70 dark:text-white/70">Online</span>
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
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-pixelify font-bold transition-colors duration-500 ${m.role === 'user'
                    ? 'bg-black/5 dark:bg-white/5 text-black dark:text-white border border-black/10 dark:border-white/10'
                    : 'bg-black/5 dark:bg-white/5 text-black dark:text-white border border-black/10 dark:border-white/10'
                    }`}
                >
                  {m.role === 'user' ? 'U' : 'AI'}
                </div>

                {/* Message bubble */}
                <div className="flex-1 min-w-0 max-w-[85%]">
                  {/* Role label */}
                  <div
                    className={`font-stzhongsong text-xs mb-1.5 ${m.role === 'user'
                      ? 'text-right text-black/50 dark:text-white/50'
                      : 'text-left text-black/50 dark:text-white/50'
                      }`}
                  >
                    {m.role === 'user' ? 'You' : 'AI Scout'}
                  </div>

                  <div
                    className={`rounded-2xl px-5 py-4 transition-colors duration-500 ${m.role === 'user'
                      ? 'bg-black/5 dark:bg-white/5 text-black dark:text-white border border-black/10 dark:border-white/10'
                      : 'text-black dark:text-white border border-black/10 dark:border-white/10'
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
                {/* AI Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-pixelify font-bold bg-black/5 dark:bg-white/5 text-black dark:text-white border border-black/10 dark:border-white/10">
                  AI
                </div>
                {/* Typing indicator */}
                <div className="flex-1">
                  <div className="font-stzhongsong text-xs mb-1.5 text-black/50 dark:text-white/50">AI Scout</div>
                  <div className="rounded-2xl px-5 py-4 border border-black/10 dark:border-white/10 inline-flex gap-1.5">
                    <span className="w-2 h-2 bg-black/30 dark:bg-white/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-black/30 dark:bg-white/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-black/30 dark:bg-white/30 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="px-8 py-6">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend()
              }}
              placeholder="Ask about candidates... (⌘/Ctrl + Enter to send)"
              className="flex-1 resize-none rounded-2xl border border-black/10 dark:border-white/10 bg-transparent px-5 py-4 text-black dark:text-white font-stzhongsong text-sm outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors duration-200 placeholder:text-black/40 dark:placeholder:text-white/40 min-h-[68px]"
              rows={2}
            />
            <Button
              onClick={handleSend}
              disabled={!canSend}
              className="h-[68px] px-8 bg-[#222] text-white disabled:opacity-30 dark:bg-white dark:text-black font-pixelify text-sm rounded-2xl hover:bg-[#333] dark:hover:bg-gray-100 transition-all duration-200 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? 'Sending' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}



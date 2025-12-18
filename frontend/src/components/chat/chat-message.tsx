"use client"

import { motion } from 'motion/react'
import { ChatMessageResponse, ToolCallSchema } from '@/lib/api-client'

interface ChatMessageProps {
  message: ChatMessageResponse
  isLatest?: boolean
}

/**
 * Renders a single chat message bubble.
 * User messages are right-aligned, assistant messages are left-aligned.
 */
export function ChatMessage({ message, isLatest = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-accent-blue text-white rounded-br-md'
            : 'bg-surface border border-border text-foreground rounded-bl-md'
        }`}
      >
        {/* Tool calls indicator */}
        {isAssistant && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mb-2 pb-2 border-b border-border/50">
            <ToolCallIndicators toolCalls={message.tool_calls} />
          </div>
        )}

        {/* Message content with basic markdown support */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          <MessageContent content={message.content} />
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs mt-2 ${
            isUser ? 'text-white/70' : 'text-muted-foreground'
          }`}
        >
          {formatTime(message.created_at)}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Renders tool call badges/indicators
 */
function ToolCallIndicators({ toolCalls }: { toolCalls: ToolCallSchema[] }) {
  const toolIcons: Record<string, string> = {
    search_candidate_repositories: '🔍',
    get_repository_details: '📂',
    compare_candidate_to_job: '📊',
    search_similar_candidates: '👥',
    analyze_github_activity: '📈',
    generate_interview_questions: '❓',
    web_search: '🌐',
  }

  const toolLabels: Record<string, string> = {
    search_candidate_repositories: 'Searched repos',
    get_repository_details: 'Repo details',
    compare_candidate_to_job: 'Compared to job',
    search_similar_candidates: 'Similar candidates',
    analyze_github_activity: 'Activity analysis',
    generate_interview_questions: 'Interview questions',
    web_search: 'Web search',
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {toolCalls.map((tc, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-purple/10 border border-accent-purple/20 rounded-full text-xs text-accent-purple"
          title={`Arguments: ${JSON.stringify(tc.arguments)}`}
        >
          <span>{toolIcons[tc.tool] || '🔧'}</span>
          <span>{toolLabels[tc.tool] || tc.tool}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * Renders message content with basic formatting support
 */
function MessageContent({ content }: { content: string }) {
  // Simple code block detection
  const parts = content.split(/(```[\s\S]*?```)/g)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Code block
          const codeContent = part.slice(3, -3)
          const firstNewline = codeContent.indexOf('\n')
          const language = firstNewline > 0 ? codeContent.slice(0, firstNewline).trim() : ''
          const code = firstNewline > 0 ? codeContent.slice(firstNewline + 1) : codeContent

          return (
            <pre
              key={index}
              className="my-2 p-3 bg-background/50 rounded-lg overflow-x-auto text-xs font-mono border border-border/50"
            >
              {language && (
                <div className="text-muted-foreground mb-1 text-[10px] uppercase">
                  {language}
                </div>
              )}
              <code>{code}</code>
            </pre>
          )
        }

        // Inline code detection
        const inlineParts = part.split(/(`[^`]+`)/g)
        return (
          <span key={index}>
            {inlineParts.map((inlinePart, inlineIndex) => {
              if (inlinePart.startsWith('`') && inlinePart.endsWith('`')) {
                return (
                  <code
                    key={inlineIndex}
                    className="px-1.5 py-0.5 bg-background/50 rounded text-xs font-mono border border-border/50"
                  >
                    {inlinePart.slice(1, -1)}
                  </code>
                )
              }
              // Bold text **text**
              const boldParts = inlinePart.split(/(\*\*[^*]+\*\*)/g)
              return (
                <span key={inlineIndex}>
                  {boldParts.map((boldPart, boldIndex) => {
                    if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                      return <strong key={boldIndex}>{boldPart.slice(2, -2)}</strong>
                    }
                    return <span key={boldIndex}>{boldPart}</span>
                  })}
                </span>
              )
            })}
          </span>
        )
      })}
    </>
  )
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default ChatMessage




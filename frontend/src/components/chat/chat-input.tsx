"use client"

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

/**
 * Chat input component with auto-resize textarea.
 * - Enter to send, Shift+Enter for new line
 * - Character limit with counter
 * - Auto-resize based on content
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask about this candidate...',
  maxLength = 2000,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /**
   * Auto-resize textarea based on content
   */
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [value])

  /**
   * Handle input change
   */
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      setValue(newValue)
    }
  }

  /**
   * Handle key press - Enter to send, Shift+Enter for new line
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /**
   * Send message
   */
  const handleSend = () => {
    const trimmedValue = value.trim()
    if (trimmedValue && !disabled) {
      onSend(trimmedValue)
      setValue('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const isOverLimit = value.length > maxLength * 0.9
  const canSend = value.trim().length > 0 && !disabled

  return (
    <div className="border-t border-border bg-white dark:bg-surface p-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className={`
              w-full resize-none rounded-xl border border-border bg-background
              px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            `}
            style={{ minHeight: '44px', maxHeight: '150px' }}
          />
          
          {/* Character counter */}
          <div
            className={`absolute bottom-1 right-2 text-[10px] ${
              isOverLimit ? 'text-red-500' : 'text-muted-foreground/50'
            }`}
          >
            {value.length}/{maxLength}
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`
            flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
            transition-all duration-200
            ${
              canSend
                ? 'bg-accent-blue text-white hover:bg-accent-blue/90 hover:shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
          title={disabled ? 'Waiting for response...' : 'Send message'}
        >
          <SendIcon />
        </button>
      </div>

      {/* Helper text */}
      <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  )
}

/**
 * Send icon SVG
 */
function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  )
}

export default ChatInput




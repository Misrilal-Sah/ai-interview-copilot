// src/components/ChatInput/ChatInput.tsx — Multi-turn chatbot panel for the overlay
import { useState, useRef, useEffect, useCallback } from "react"
import { Send, X, Trash2, Copy, ChevronDown } from "lucide-react"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  providerId?: string
  model?: string
  timestamp: Date
}

interface ChatInputProps {
  isOpen: boolean
  onClose: () => void
  onAddToHistory?: (entry: {
    question: string
    answer: string
    providerId: string
    model: string
  }) => void
}

export function ChatInput({ isOpen, onClose, onAddToHistory }: ChatInputProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Listen for chat toggle hotkey
  useEffect(() => {
    const unsub = window.electronAPI.onChatToggle(() => {
      if (isOpen) {
        onClose()
      }
    })
    return unsub
  }, [isOpen, onClose])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      // Build history for the API (exclude the current message)
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }))

      const result = await window.electronAPI.processChatQuestion(text, history)

      if (result.success && result.text) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: result.text,
          providerId: result.providerId,
          model: result.model,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])

        // Add to main history panel
        onAddToHistory?.({
          question: text,
          answer: result.text,
          providerId: result.providerId ?? "",
          model: result.model ?? ""
        })
      } else {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: `❌ ${result.error ?? "Unknown error occurred"}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Error: ${msg}`,
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages, onAddToHistory])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopy = (text: string) => {
    window.electronAPI.writeClipboard(text)
  }

  const handleClear = () => {
    setMessages([])
  }

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="border-b border-white/10 bg-black/70 backdrop-blur-md flex flex-col"
      style={{
        maxHeight: "55vh",
        WebkitAppRegion: "no-drag"
      } as React.CSSProperties}
    >
      {/* Chat header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/70 text-xs font-medium">AI Chat</span>
          <span className="text-white/30 text-xs">({messages.length} messages)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              title="Clear chat"
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close chat (Ctrl+Shift+C)"
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 space-y-3"
        style={{ minHeight: "80px", maxHeight: "35vh" }}
      >
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-3 border border-emerald-500/20">
              <span className="text-lg">💬</span>
            </div>
            <p className="text-white/50 text-xs">Type a question below…</p>
            <p className="text-white/30 text-xs mt-1">Invisible to screen capture</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600/30 border border-blue-500/30 text-white/90"
                  : "bg-white/5 border border-white/10 text-white/80"
              }`}
              style={{ userSelect: "text" }}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              {msg.role === "assistant" && !msg.content.startsWith("❌") && (
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                  <span className="text-white/25 text-xs">
                    {msg.providerId && msg.model ? `${msg.providerId} · ${msg.model}` : ""}
                  </span>
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="text-white/30 hover:text-white/60 transition-colors"
                    title="Copy response"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-white/40 text-xs">Thinking…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 px-3 py-2 border-t border-white/10 flex-shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
          rows={1}
          disabled={loading}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none focus:border-white/25 placeholder:text-white/30 disabled:opacity-50"
          style={{
            minHeight: "36px",
            maxHeight: "80px",
            WebkitAppRegion: "no-drag"
          } as React.CSSProperties}
          onInput={(e) => {
            // Auto-resize textarea
            const target = e.target as HTMLTextAreaElement
            target.style.height = "auto"
            target.style.height = Math.min(target.scrollHeight, 80) + "px"
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          title="Send message"
          className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all ${
            input.trim() && !loading
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              : "bg-white/5 text-white/20 cursor-not-allowed"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

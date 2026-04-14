// src/components/History/AnswerHistory.tsx
import { Camera, Mic, Clock, Trash2 } from "lucide-react"

export interface HistoryEntry {
  id: string
  timestamp: Date
  source: "screenshot" | "voice"
  question: string
  answer: string
  providerId: string
  model: string
  screenshotThumb: string | null
}

interface AnswerHistoryProps {
  entries: HistoryEntry[]
  onSelectEntry: (entry: HistoryEntry) => void
  onClear: () => void
  isOpen: boolean
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + "…"
}

export function AnswerHistory({ entries, onSelectEntry, onClear, isOpen }: AnswerHistoryProps) {
  if (!isOpen) return null

  return (
    <div
      className="w-full border-t border-white/10 bg-black/60 backdrop-blur-sm overflow-hidden"
      style={{
        maxHeight: 250,
        transition: "max-height 0.25s ease, opacity 0.2s ease",
        overflowY: "auto"
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 sticky top-0 bg-black/80 z-10">
        <div className="flex items-center gap-1.5 text-white/50 text-xs">
          <Clock className="w-3 h-3" />
          <span>History ({entries.length})</span>
        </div>
        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="text-white/30 hover:text-red-400 transition-colors text-xs flex items-center gap-1"
            title="Clear history"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="px-3 py-4 text-white/30 text-xs text-center">
          No history yet. Take a screenshot or ask a voice question.
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {entries.slice(0, 20).map(entry => (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-start gap-2">
                {/* Icon */}
                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  entry.source === "voice" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                }`}>
                  {entry.source === "voice"
                    ? <Mic className="w-2.5 h-2.5" />
                    : <Camera className="w-2.5 h-2.5" />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/70 text-xs font-medium truncate">
                      {truncate(entry.question, 60)}
                    </span>
                    <span className="text-white/30 text-xs flex-shrink-0">{formatTime(entry.timestamp)}</span>
                  </div>
                  <p className="text-white/35 text-xs mt-0.5 line-clamp-2">
                    {truncate(entry.answer.replace(/\*+|#{1,6}|`/g, ""), 80)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

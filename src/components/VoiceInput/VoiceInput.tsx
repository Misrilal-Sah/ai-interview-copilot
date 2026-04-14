// src/components/VoiceInput/VoiceInput.tsx
// Uses MediaRecorder instead of SpeechRecognition (not available in Electron)
import { useState, useRef, useEffect, useCallback } from "react"
import { Mic, MicOff, X, Square } from "lucide-react"

interface VoiceInputProps {
  onTranscriptReady: (transcript: string) => void
  disabled?: boolean
}

type RecordingState = "idle" | "requesting" | "recording" | "processing" | "error"

export function VoiceInput({ onTranscriptReady, disabled = false }: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Listen for the global voice toggle hotkey (Ctrl+Shift+V)
  useEffect(() => {
    const unsub = window.electronAPI.onVoiceToggle(() => {
      if (!disabled) {
        if (state === "recording") {
          stopRecording()
        } else if (state === "idle") {
          startRecording()
        }
      }
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, state])

  const clearTimers = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null }
  }

  const startRecording = useCallback(async () => {
    setError(null)
    setState("requesting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Try multiple mime types — Electron Chromium supports webm/opus
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find(
        m => MediaRecorder.isTypeSupported(m)
      ) ?? ""

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        clearTimers()
        // Stop all tracks
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setState("processing")

        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" })
        if (blob.size < 1000) {
          setState("idle")
          setSeconds(0)
          setError("Recording too short. Hold and speak clearly.")
          return
        }

        // Convert to base64 for IPC
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1]
            // @ts-ignore — transcribeAudio is added below in preload
            const result = await window.electronAPI.transcribeAudio?.(base64, mimeType || "audio/webm")
            if (result?.transcript) {
              onTranscriptReady(result.transcript)
            } else {
              setError(result?.error ?? "Could not transcribe audio. Try again.")
            }
          } catch (err) {
            setError("Transcription failed. Check your API key in Settings.")
          } finally {
            setState("idle")
            setSeconds(0)
          }
        }
        reader.readAsDataURL(blob)
      }

      mediaRecorderRef.current = recorder
      recorder.start(250) // collect chunks every 250ms
      setState("recording")
      setSeconds(0)

      // Live timer
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)

      // Auto-stop after 30s
      autoStopRef.current = setTimeout(() => stopRecording(), 30000)
    } catch (err) {
      setState("idle")
      const msg = (err as Error).message
      if (msg.includes("Permission denied") || msg.includes("NotAllowed")) {
        setError("Mic denied. Allow microphone access in Windows Settings → Privacy → Microphone.")
      } else {
        setError(`Could not access microphone: ${msg}`)
      }
    }
  }, [onTranscriptReady])

  const stopRecording = useCallback(() => {
    clearTimers()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers()
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop()
      }
    }
  }, [])

  const handleToggle = () => {
    if (disabled) return
    setError(null)
    if (state === "recording") {
      stopRecording()
    } else if (state === "idle") {
      startRecording()
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative group">
        <button
          id="voice-input-btn"
          onClick={handleToggle}
          disabled={disabled || state === "processing" || state === "requesting"}
          title={
            state === "recording"
              ? `Stop recording (${seconds}s)`
              : state === "processing"
              ? "Transcribing…"
              : "Voice input (Ctrl+Shift+V)"
          }
          className={`
            w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200
            ${state === "recording"
              ? "bg-red-500/20 text-red-400 ring-2 ring-red-500 animate-pulse"
              : state === "processing" || state === "requesting"
              ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500"
              : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90"
            }
            ${disabled || state === "processing" || state === "requesting"
              ? "opacity-60 cursor-not-allowed"
              : "cursor-pointer"}
          `}
        >
          {state === "recording"
            ? <Square className="w-3 h-3 fill-red-400" />
            : state === "processing" || state === "requesting"
            ? <Mic className="w-4 h-4 opacity-60" />
            : <Mic className="w-4 h-4" />
          }
        </button>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white/80 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {state === "recording"
            ? `Recording… ${seconds}s (click to stop)`
            : state === "processing"
            ? "Transcribing…"
            : state === "requesting"
            ? "Requesting mic…"
            : "Voice input (Ctrl+Shift+V)"}
        </div>
      </div>

      {/* Recording timer */}
      {state === "recording" && (
        <p className="text-xs text-red-400 font-mono tabular-nums">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
        </p>
      )}

      {/* Processing indicator */}
      {(state === "processing" || state === "requesting") && (
        <p className="text-xs text-yellow-400/70 italic">
          {state === "requesting" ? "Starting mic…" : "Transcribing…"}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1 max-w-[180px]">
          <p className="text-xs text-red-400 text-center leading-tight">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400/60 hover:text-red-400 flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

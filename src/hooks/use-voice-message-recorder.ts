import { useCallback, useRef, useState } from 'react'

interface UseVoiceMessageRecorderResult {
  recording: boolean
  seconds: number
  error: string | null
  start: () => Promise<void>
  stop: () => void
  cancel: () => void
}

export function useVoiceMessageRecorder(
  onRecorded: (blob: Blob) => void
): UseVoiceMessageRecorderResult {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef = useRef(false)

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
    chunksRef.current = []
    setSeconds(0)
    setRecording(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    cancelledRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const wasCancelled = cancelledRef.current
        cleanup()
        if (!wasCancelled && blob.size > 0) onRecorded(blob)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      setError('No se pudo acceder al micrófono.')
      cleanup()
    }
  }, [cleanup, onRecorded])

  const stop = useCallback(() => {
    cancelledRef.current = false
    mediaRecorderRef.current?.stop()
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    mediaRecorderRef.current?.stop()
  }, [])

  return { recording, seconds, error, start, stop, cancel }
}

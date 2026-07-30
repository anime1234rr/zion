import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/message-format'

interface VoiceMessagePlayerProps {
  url: string
  className?: string
}

export function VoiceMessagePlayer({ url, className }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    function onTimeUpdate() {
      setCurrentTime(audio!.currentTime)
    }
    function onLoadedMetadata() {
      if (Number.isFinite(audio!.duration)) setDuration(audio!.duration)
    }
    function onEnded() {
      setPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [url])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const value = Number(event.target.value)
    audio.currentTime = value
    setCurrentTime(value)
  }

  return (
    <div
      className={cn(
        'flex w-64 max-w-full items-center gap-2 rounded-full border border-border bg-muted/40 px-2 py-1.5',
        className
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {playing ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5" />}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        aria-label="Progreso del mensaje de voz"
        className="h-1 flex-1 accent-primary"
      />
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {formatDuration(currentTime > 0 ? currentTime : duration)}
      </span>
    </div>
  )
}

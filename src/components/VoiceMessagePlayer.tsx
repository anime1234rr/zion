import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react'

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
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [volume, setVolume] = useState(1)
  const [volumeOpen, setVolumeOpen] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume
  }, [volume])

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
    function onError() {
      setPlaying(false)
      setPlaybackError('No se pudo reproducir este audio en tu navegador.')
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [url])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(
        () => setPlaying(true),
        () => setPlaybackError('No se pudo reproducir este audio en tu navegador.')
      )
    }
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const value = Number(event.target.value)
    audio.currentTime = value
    setCurrentTime(value)
  }

  function toggleMute() {
    setVolume((prev) => (prev > 0 ? 0 : 1))
  }

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div
      className={cn(
        'flex w-fit min-w-64 max-w-full items-center gap-2 rounded-full border border-border bg-muted/40 px-2 py-1.5',
        playbackError && 'border-destructive/40',
        className
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      {playbackError ? (
        <span className="min-w-0 flex-1 truncate px-1 text-xs text-destructive">{playbackError}</span>
      ) : (
        <>
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
          <button
            type="button"
            onClick={() => setVolumeOpen((prev) => !prev)}
            aria-expanded={volumeOpen}
            aria-label="Ajustar volumen"
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <VolumeIcon className="size-3.5" />
          </button>
          {volumeOpen && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              onDoubleClick={toggleMute}
              aria-label="Volumen"
              className="h-1 w-14 shrink-0 accent-primary"
            />
          )}
        </>
      )}
    </div>
  )
}

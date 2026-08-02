import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

interface VideoTileProps {
  stream: MediaStream
  muted?: boolean
  mirrored?: boolean
  className?: string
}

export function VideoTile({ stream, muted = false, mirrored = false, className }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream
    return () => {
      el.srcObject = null
    }
  }, [stream])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={cn('absolute inset-0 block size-full object-cover', className)}
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
    />
  )
}

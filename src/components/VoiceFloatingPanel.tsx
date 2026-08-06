import { useRef, useState } from 'react'
import { GripHorizontal, Headphones, HeadphoneOff, LogOut, Maximize2, Mic, MicOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  leaveVoiceChannel,
  toggleDeafen,
  toggleMute,
  useVoiceConnection,
} from '@/hooks/use-voice-connection'
import { VideoTile } from '@/components/VideoTile'
import { ControlButton } from '@/components/VoiceChannelView'

interface FocusTile {
  name: string
  isSelf: boolean
  speaking: boolean
  cameraStream?: MediaStream
  screenStream?: MediaStream
}

interface VoiceFloatingPanelProps {
  currentUserId: string
  hidden: boolean
  onReturnToChannel: (serverId: string, channelId: string) => void
}

export function VoiceFloatingPanel({ currentUserId, hidden, onReturnToChannel }: VoiceFloatingPanelProps) {
  const {
    connectedChannelId,
    connectedServerId,
    connectedChannelName,
    participants,
    muted,
    deafened,
    localCameraStream,
    localScreenStream,
    remoteStreams,
    speakingUserIds,
  } = useVoiceConnection()

  const panelRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef<{ x: number; y: number } | null>(null)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

  function handleDragPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const el = panelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleDragPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragOffset.current) return
    const el = panelRef.current
    if (!el) return
    const maxX = Math.max(0, window.innerWidth - el.offsetWidth)
    const maxY = Math.max(0, window.innerHeight - el.offsetHeight)
    setPosition({
      x: Math.min(Math.max(0, event.clientX - dragOffset.current.x), maxX),
      y: Math.min(Math.max(0, event.clientY - dragOffset.current.y), maxY),
    })
  }

  function handleDragPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    dragOffset.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  if (!connectedChannelId || !connectedServerId || hidden) return null

  const tiles: FocusTile[] = participants.map((participant) => {
    const isSelf = participant.user.id === currentUserId
    return {
      name: participant.user.name,
      isSelf,
      speaking: !participant.muted && speakingUserIds.has(participant.user.id),
      cameraStream: isSelf ? (localCameraStream ?? undefined) : remoteStreams[participant.user.id]?.camera,
      screenStream: isSelf ? (localScreenStream ?? undefined) : remoteStreams[participant.user.id]?.screen,
    }
  })

  const focusTile = tiles.find((t) => t.screenStream) ?? tiles.find((t) => t.cameraStream)

  function handleReturn() {
    if (connectedServerId && connectedChannelId) onReturnToChannel(connectedServerId, connectedChannelId)
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed z-40 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-xl sm:w-64',
        position ? 'right-auto bottom-auto' : 'right-4 bottom-4'
      )}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      <div
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
        onPointerCancel={handleDragPointerUp}
        className="flex cursor-grab items-center justify-center border-b border-border bg-muted/40 py-1 touch-none active:cursor-grabbing"
      >
        <GripHorizontal className="size-3.5 text-muted-foreground" />
      </div>
      {focusTile ? (
        <button
          type="button"
          onClick={handleReturn}
          aria-label="Volver al canal de voz"
          className={cn(
            'relative block aspect-video w-full overflow-hidden bg-black outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            focusTile.speaking && 'ring-2 ring-online'
          )}
        >
          <VideoTile
            stream={(focusTile.screenStream ?? focusTile.cameraStream) as MediaStream}
            muted={focusTile.isSelf}
            mirrored={focusTile.isSelf && Boolean(focusTile.cameraStream) && !focusTile.screenStream}
            className={focusTile.screenStream ? 'object-contain' : 'object-cover'}
          />
          <span className="absolute bottom-1.5 left-1.5 max-w-[70%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {focusTile.name}
          </span>
          <Maximize2 className="absolute top-1.5 right-1.5 size-3.5 text-white/80" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleReturn}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-online opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-online" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {connectedChannelName ?? 'Canal de voz'}
          </span>
          <Maximize2 className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      )}

      <div className="flex items-center justify-center gap-1 border-t border-border p-1.5">
        <ControlButton
          onClick={() => toggleMute()}
          active={muted}
          label={muted ? 'Activar micrófono' : 'Silenciar micrófono'}
        >
          {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </ControlButton>
        <ControlButton
          onClick={() => toggleDeafen()}
          active={deafened}
          label={deafened ? 'Activar audio' : 'Ensordecer'}
        >
          {deafened ? <HeadphoneOff className="size-4" /> : <Headphones className="size-4" />}
        </ControlButton>
        <ControlButton onClick={() => leaveVoiceChannel()} active label="Desconectar" activeColor="destructive">
          <LogOut className="size-4" />
        </ControlButton>
      </div>
    </div>
  )
}

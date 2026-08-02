import { useEffect, useState } from 'react'
import {
  Headphones,
  HeadphoneOff,
  LogOut,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  Sliders,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react'

import { cn, getErrorMessage } from '@/lib/utils'
import {
  joinVoiceChannel,
  leaveVoiceChannel,
  startScreenShare,
  stopScreenShare,
  toggleCamera,
  toggleDeafen,
  toggleForceMuteParticipant,
  toggleMute,
  useVoiceConnection,
} from '@/hooks/use-voice-connection'
import { useChannelPermissions } from '@/hooks/use-channel-permissions'
import type { ChannelItem, ServerItem } from '@/lib/types'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { VideoTile } from '@/components/VideoTile'
import { ScreenSharePickerDialog } from '@/components/ScreenSharePickerDialog'
import { AudioSettingsDialog } from '@/components/AudioSettingsDialog'

interface VoiceChannelViewProps {
  channel: ChannelItem
  server: ServerItem
  currentUserId: string
}

interface Tile {
  userId: string
  name: string
  avatarUrl?: string
  muted: boolean
  isSelf: boolean
  speaking: boolean
  cameraStream?: MediaStream
  screenStream?: MediaStream
}

export function VoiceChannelView({ channel, server, currentUserId }: VoiceChannelViewProps) {
  const {
    connectedChannelId,
    connecting,
    participants,
    muted,
    deafened,
    cameraOn,
    sharingScreen,
    localCameraStream,
    localScreenStream,
    remoteStreams,
    speakingUserIds,
    error,
  } = useVoiceConnection()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false)
  const [forceMuteError, setForceMuteError] = useState<string | null>(null)
  const {
    loading: permissionsLoading,
    canForceMuteVoice,
    canConnectVoice,
    canSpeakVoice,
  } = useChannelPermissions(server, channel.id, currentUserId)

  const isConnectedHere = connectedChannelId === channel.id

  useEffect(() => {
    if (permissionsLoading || !canConnectVoice) return
    if (connectedChannelId !== channel.id) {
      joinVoiceChannel(channel.id, currentUserId, server.id, channel.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, currentUserId, server.id, permissionsLoading, canConnectVoice])

  const tiles: Tile[] = participants.map((participant) => {
    const isSelf = participant.user.id === currentUserId
    return {
      userId: participant.user.id,
      name: participant.user.name,
      avatarUrl: participant.user.avatarUrl,
      muted: participant.muted,
      isSelf,
      speaking: !participant.muted && speakingUserIds.has(participant.user.id),
      cameraStream: isSelf ? (localCameraStream ?? undefined) : remoteStreams[participant.user.id]?.camera,
      screenStream: isSelf ? (localScreenStream ?? undefined) : remoteStreams[participant.user.id]?.screen,
    }
  })

  const otherTiles = tiles.filter((t) => !t.isSelf)
  const selfShownInCorner = cameraOn && Boolean(localCameraStream)
  const galleryTiles = selfShownInCorner ? otherTiles : tiles

  const focusTile = tiles.find((t) => t.screenStream)
  const selfScreenIsFocused = Boolean(focusTile?.isSelf && focusTile.screenStream)

  function handleToggleScreenShare() {
    if (sharingScreen) {
      stopScreenShare()
    } else {
      setPickerOpen(true)
    }
  }

  async function handleForceMute(tile: Tile) {
    setForceMuteError(null)
    try {
      await toggleForceMuteParticipant(tile.userId, !tile.muted)
    } catch (err) {
      setForceMuteError(getErrorMessage(err))
    }
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <Volume2 className="size-5 shrink-0 text-muted-foreground" />
        <h1 className="min-w-0 shrink truncate text-sm font-semibold text-foreground">
          {channel.name}
        </h1>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6">
        {!permissionsLoading && !canConnectVoice && !isConnectedHere && (
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            No tenés permiso para conectarte a este canal de voz.
          </p>
        )}

        {canConnectVoice && connecting && !isConnectedHere && (
          <p className="text-sm text-muted-foreground">Conectando…</p>
        )}

        {error && (
          <p className="max-w-sm text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {forceMuteError && (
          <p className="max-w-sm text-center text-sm text-destructive" role="alert">
            {forceMuteError}
          </p>
        )}

        {isConnectedHere && (
          <>
            {focusTile ? (
              <div className="flex w-full flex-1 gap-3">
                <div
                  className={cn(
                    'relative flex-1 overflow-hidden rounded-xl bg-black',
                    focusTile.speaking && 'ring-2 ring-online'
                  )}
                >
                  <VideoTile
                    stream={focusTile.screenStream as MediaStream}
                    muted={focusTile.isSelf}
                    className="object-contain"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                    {focusTile.muted && <MicOff className="size-3.5 text-destructive" />}
                    <span className="truncate text-sm font-medium text-white">{focusTile.name}</span>
                  </div>
                </div>
                <div className="flex w-40 shrink-0 flex-col gap-2 overflow-y-auto">
                  {galleryTiles.map((tile) => (
                    <SmallTile
                      key={tile.userId}
                      tile={tile}
                      canForceMute={canForceMuteVoice}
                      onForceMute={handleForceMute}
                    />
                  ))}
                </div>
              </div>
            ) : otherTiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sos el único acá. Invitá a alguien a sumarse.
              </p>
            ) : (
              <div className="grid w-full flex-1 auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {galleryTiles.map((tile) => (
                  <GalleryTile
                    key={tile.userId}
                    tile={tile}
                    canForceMute={canForceMuteVoice}
                    onForceMute={handleForceMute}
                  />
                ))}
              </div>
            )}

            <div className="mt-2 flex items-center gap-2 rounded-full border border-border bg-muted/30 p-1.5">
              <ControlButton
                onClick={() => toggleMute()}
                active={muted}
                disabled={!canSpeakVoice}
                label={
                  !canSpeakVoice
                    ? 'No tenés permiso para hablar en este canal'
                    : muted
                      ? 'Activar micrófono'
                      : 'Silenciar micrófono'
                }
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
              <ControlButton
                onClick={() => toggleCamera()}
                active={cameraOn}
                activeColor="primary"
                label={cameraOn ? 'Apagar cámara' : 'Prender cámara'}
              >
                {cameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
              </ControlButton>
              <ControlButton
                onClick={handleToggleScreenShare}
                active={sharingScreen}
                activeColor="primary"
                label={sharingScreen ? 'Dejar de compartir pantalla' : 'Compartir pantalla'}
              >
                {sharingScreen ? <MonitorOff className="size-4" /> : <MonitorUp className="size-4" />}
              </ControlButton>
              <ControlButton
                onClick={() => setAudioSettingsOpen(true)}
                active={false}
                label="Configuración de voz"
              >
                <Sliders className="size-4" />
              </ControlButton>
              <ControlButton onClick={() => leaveVoiceChannel()} active label="Desconectar" activeColor="destructive">
                <LogOut className="size-4" />
              </ControlButton>
            </div>
          </>
        )}

        {isConnectedHere && (cameraOn || (sharingScreen && !selfScreenIsFocused)) && (
          <div className="pointer-events-none absolute right-4 bottom-20 z-10 flex flex-col items-end gap-2">
            {cameraOn && localCameraStream && (
              <LocalPreviewCard
                stream={localCameraStream}
                mirrored
                label="Vos"
                speaking={!muted && speakingUserIds.has(currentUserId)}
              />
            )}
            {sharingScreen && localScreenStream && !selfScreenIsFocused && (
              <LocalPreviewCard stream={localScreenStream} label="Tu pantalla" />
            )}
          </div>
        )}
      </div>

      <ScreenSharePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={(sourceId, includeAudio) => startScreenShare(sourceId, includeAudio)}
      />

      <AudioSettingsDialog open={audioSettingsOpen} onOpenChange={setAudioSettingsOpen} />
    </section>
  )
}

export function ControlButton({
  onClick,
  active,
  label,
  activeColor = 'destructive',
  disabled = false,
  children,
}: {
  onClick: () => void
  active: boolean
  label: string
  activeColor?: 'destructive' | 'primary'
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={active}
          aria-label={label}
          className={cn(
            'flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40',
            active && activeColor === 'destructive' && 'bg-destructive/10 text-destructive',
            active && activeColor === 'primary' && 'bg-primary/10 text-primary'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

function LocalPreviewCard({
  stream,
  mirrored = false,
  label,
  speaking = false,
}: {
  stream: MediaStream
  mirrored?: boolean
  label: string
  speaking?: boolean
}) {
  return (
    <div
      className={cn(
        'w-36 overflow-hidden rounded-lg bg-black shadow-lg ring-1 ring-white/10 sm:w-44',
        speaking && 'ring-2 ring-online'
      )}
    >
      <div className="relative aspect-video">
        <VideoTile
          stream={stream}
          muted
          mirrored={mirrored}
          className={mirrored ? 'object-cover' : 'object-contain'}
        />
        <span className="absolute bottom-1 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {label}
        </span>
      </div>
    </div>
  )
}

function TileAvatar({ tile, size }: { tile: Tile; size: 'lg' | 'sm' }) {
  return (
    <Avatar
      size={size === 'lg' ? 'lg' : 'sm'}
      className={cn(tile.speaking && 'ring-2 ring-online')}
    >
      {tile.avatarUrl && <AvatarImage src={tile.avatarUrl} />}
      <AvatarFallback>{tile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      <AvatarBadge className="bg-online" />
    </Avatar>
  )
}

interface TileModeratorProps {
  canForceMute: boolean
  onForceMute: (tile: Tile) => void
}

function ForceMuteButton({
  tile,
  onForceMute,
  variant = 'light',
}: {
  tile: Tile
  onForceMute: (tile: Tile) => void
  variant?: 'light' | 'dark'
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onForceMute(tile)
          }}
          aria-label={tile.muted ? `Quitar silencio a ${tile.name}` : `Silenciar a ${tile.name}`}
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            variant === 'dark'
              ? 'text-white/80 hover:bg-white/20 hover:text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            tile.muted && 'text-destructive'
          )}
        >
          {tile.muted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{tile.muted ? 'Quitar silencio' : 'Silenciar en voz'}</TooltipContent>
    </Tooltip>
  )
}

function GalleryTile({ tile, canForceMute, onForceMute }: { tile: Tile } & TileModeratorProps) {
  const stream = tile.cameraStream ?? tile.screenStream

  return (
    <div
      className={cn(
        'relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-xl bg-muted/30',
        tile.speaking && 'ring-2 ring-online'
      )}
    >
      {stream ? (
        <VideoTile
          stream={stream}
          muted={tile.isSelf}
          mirrored={tile.isSelf && Boolean(tile.cameraStream)}
        />
      ) : (
        <TileAvatar tile={tile} size="lg" />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
        {tile.muted && <MicOff className="size-3 text-destructive" />}
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">{tile.name}</span>
        {canForceMute && !tile.isSelf && (
          <ForceMuteButton tile={tile} onForceMute={onForceMute} variant="dark" />
        )}
      </div>
    </div>
  )
}

function SmallTile({ tile, canForceMute, onForceMute }: { tile: Tile } & TileModeratorProps) {
  const stream = tile.cameraStream

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg bg-muted/30 p-1.5',
        tile.speaking && 'ring-2 ring-online'
      )}
    >
      {stream ? (
        <div className="relative size-9 shrink-0 overflow-hidden rounded-md">
          <VideoTile stream={stream} muted={tile.isSelf} mirrored={tile.isSelf} />
        </div>
      ) : (
        <TileAvatar tile={tile} size="sm" />
      )}
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{tile.name}</span>
      {tile.muted && <MicOff className="size-3 shrink-0 text-destructive" />}
      {canForceMute && !tile.isSelf && <ForceMuteButton tile={tile} onForceMute={onForceMute} />}
    </div>
  )
}

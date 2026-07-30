import { useEffect, useState } from 'react'
import { Crown, Mic, MicOff } from 'lucide-react'

import {
  listarMiembros,
  suscribirseAMiembrosDeServidor,
  type ServerMember,
} from '@/lib/members'
import {
  listarParticipantesDeVozDelServidor,
  suscribirseAEstadosVozGlobal,
  type VoiceParticipant,
} from '@/lib/voice'
import { cn, getErrorMessage } from '@/lib/utils'
import { useResizablePanel } from '@/hooks/use-resizable-panel'
import { useVoiceConnection } from '@/hooks/use-voice-connection'
import type { ServerItem, UserStatus } from '@/lib/types'
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ResizeHandle } from '@/components/ui/resize-handle'
import { UserProfileCard } from '@/components/UserProfileCard'

const statusColor: Record<UserStatus, string> = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-muted-foreground/60',
}

interface PanelMiembrosProps {
  server: ServerItem
  currentUserId: string
  onMessageUser?: (userId: string) => void
}

export function PanelMiembros({ server, currentUserId, onMessageUser }: PanelMiembrosProps) {
  const [members, setMembers] = useState<ServerMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voiceByUserId, setVoiceByUserId] = useState<Record<string, VoiceParticipant>>({})
  const { connectedChannelId, speakingUserIds } = useVoiceConnection()
  const { width, resizing, handlePointerDown } = useResizablePanel({
    storageKey: 'zion:panel-miembros-width',
    defaultWidth: 240,
    minWidth: 180,
    maxWidth: 400,
    edge: 'left',
  })

  useEffect(() => {
    let cancelado = false
    listarMiembros(server.id)
      .then((data) => !cancelado && setMembers(data))
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))

    const unsubscribe = suscribirseAMiembrosDeServidor(server.id, () => {
      listarMiembros(server.id)
        .then((data) => !cancelado && setMembers(data))
        .catch((err) => !cancelado && setError(getErrorMessage(err)))
    })

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [server.id])

  useEffect(() => {
    let cancelado = false

    function refreshVoiceRoster() {
      listarParticipantesDeVozDelServidor(server.id)
        .then((participants) => {
          if (cancelado) return
          const byUserId: Record<string, VoiceParticipant> = {}
          for (const participant of participants) byUserId[participant.user.id] = participant
          setVoiceByUserId(byUserId)
        })
        .catch((err) => console.error('No se pudo cargar quién está en voz en este servidor', err))
    }

    refreshVoiceRoster()
    const unsubscribe = suscribirseAEstadosVozGlobal(refreshVoiceRoster)

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [server.id])

  const conectados = members.filter((m) => m.user.status !== 'offline')
  const desconectados = members.filter((m) => m.user.status === 'offline')

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-l border-sidebar-border bg-sidebar"
      style={{ width }}
    >
      <ResizeHandle edge="left" active={resizing} onPointerDown={handlePointerDown} />
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 px-2 py-3">
          {loading && (
            <p className="px-1.5 text-xs text-muted-foreground">Cargando…</p>
          )}
          {error && (
            <p className="px-1.5 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && (
            <>
              <MemberGroup
                title={`Conectados — ${conectados.length}`}
                members={conectados}
                server={server}
                currentUserId={currentUserId}
                onMessageUser={onMessageUser}
                voiceByUserId={voiceByUserId}
                connectedChannelId={connectedChannelId}
                speakingUserIds={speakingUserIds}
              />
              <MemberGroup
                title={`Desconectados — ${desconectados.length}`}
                members={desconectados}
                server={server}
                currentUserId={currentUserId}
                onMessageUser={onMessageUser}
                voiceByUserId={voiceByUserId}
                connectedChannelId={connectedChannelId}
                speakingUserIds={speakingUserIds}
                dimmed
              />
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}

function MemberGroup({
  title,
  members,
  server,
  currentUserId,
  onMessageUser,
  voiceByUserId,
  connectedChannelId,
  speakingUserIds,
  dimmed = false,
}: {
  title: string
  members: ServerMember[]
  server: ServerItem
  currentUserId: string
  onMessageUser?: (userId: string) => void
  voiceByUserId: Record<string, VoiceParticipant>
  connectedChannelId: string | null
  speakingUserIds: Set<string>
  dimmed?: boolean
}) {
  if (members.length === 0) return null

  return (
    <div>
      <p className="px-1.5 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="flex flex-col gap-0.5">
        {members.map((member) => {
          const voice = voiceByUserId[member.user.id]
          const speaking = Boolean(
            voice && connectedChannelId === voice.canalId && !voice.muted && speakingUserIds.has(member.user.id)
          )

          return (
            <li key={member.membershipId}>
              <UserProfileCard
                userId={member.user.id}
                server={server}
                currentUserId={currentUserId}
                onMessageUser={onMessageUser}
              >
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50',
                    dimmed && 'opacity-60'
                  )}
                >
                  <Avatar size="sm" className={cn(speaking && 'ring-2 ring-online')}>
                    {member.user.avatarUrl && (
                      <AvatarImage src={member.user.avatarUrl} />
                    )}
                    <AvatarFallback>
                      {member.user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                    <AvatarBadge className={statusColor[member.user.status]} />
                  </Avatar>
                  <span className="flex min-w-0 items-center gap-1 truncate text-sm text-sidebar-foreground">
                    <span className="truncate">{member.user.name}</span>
                    {member.user.id === server.ownerId && (
                      <Crown className="size-3 shrink-0 text-muted-foreground" />
                    )}
                    {voice &&
                      (voice.muted ? (
                        <MicOff className="size-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <Mic className="size-3 shrink-0 text-online" />
                      ))}
                  </span>
                </button>
              </UserProfileCard>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

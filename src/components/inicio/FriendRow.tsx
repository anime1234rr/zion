import { useState } from 'react'
import { Check, MessageSquare, MoreHorizontal, ShieldOff, UserMinus, UserX, X } from 'lucide-react'

import {
  aceptarSolicitudAmistad,
  bloquearUsuario,
  desbloquearUsuario,
  eliminarAmistad,
  rechazarSolicitudAmistad,
} from '@/lib/friends'
import { getErrorMessage } from '@/lib/utils'
import type { Friend, UserStatus } from '@/lib/types'
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserProfileCard } from '@/components/UserProfileCard'

const statusColor: Record<UserStatus, string> = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-muted-foreground/60',
}

const statusLabel: Record<UserStatus, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  offline: 'Desconectado',
}

interface FriendRowProps {
  friend: Friend
  currentUserId: string
  onMessage: (userId: string) => void
  onChanged: () => void
}

export function FriendRow({ friend, currentUserId, onMessage, onChanged }: FriendRowProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setLoading(true)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg px-2 py-2 hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <UserProfileCard
          userId={friend.user.id}
          currentUserId={currentUserId}
          onMessageUser={friend.status === 'aceptada' ? onMessage : undefined}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar>
              {friend.user.avatarUrl && <AvatarImage src={friend.user.avatarUrl} />}
              <AvatarFallback>{friend.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              {friend.status === 'aceptada' && (
                <AvatarBadge className={statusColor[friend.user.status]} />
              )}
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{friend.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {friend.status === 'aceptada' && statusLabel[friend.user.status]}
                {friend.status === 'pendiente_enviada' && 'Solicitud enviada'}
                {friend.status === 'pendiente_recibida' && 'Quiere ser tu amigo'}
                {friend.status === 'bloqueada' && 'Bloqueado'}
              </p>
            </div>
          </button>
        </UserProfileCard>

        <div className="flex shrink-0 items-center gap-1">
          {friend.status === 'aceptada' && (
            <button
              type="button"
              onClick={() => onMessage(friend.user.id)}
              aria-label="Enviar mensaje"
              disabled={loading}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <MessageSquare className="size-4" />
            </button>
          )}

          {friend.status === 'pendiente_recibida' && (
            <>
              <button
                type="button"
                onClick={() => run(() => aceptarSolicitudAmistad(friend.id))}
                aria-label="Aceptar solicitud"
                disabled={loading}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-online focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Check className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => run(() => rechazarSolicitudAmistad(friend.id))}
                aria-label="Rechazar solicitud"
                disabled={loading}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X className="size-4" />
              </button>
            </>
          )}

          {friend.status === 'pendiente_enviada' && (
            <button
              type="button"
              onClick={() => run(() => rechazarSolicitudAmistad(friend.id))}
              disabled={loading}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Cancelar
            </button>
          )}

          {friend.status === 'bloqueada' && (
            <button
              type="button"
              onClick={() => run(() => desbloquearUsuario(friend.user.id))}
              disabled={loading}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ShieldOff className="size-3.5" />
              Desbloquear
            </button>
          )}

          {friend.status === 'aceptada' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Más acciones"
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => run(() => eliminarAmistad(friend.user.id))}>
                  <UserMinus className="size-4" />
                  Eliminar amigo
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => run(() => bloquearUsuario(friend.user.id))}
                >
                  <UserX className="size-4" />
                  Bloquear
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {error && (
        <p className="px-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

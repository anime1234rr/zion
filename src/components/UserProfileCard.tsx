import { useEffect, useState } from 'react'
import { Check, Crown, MessageSquare, UserPlus } from 'lucide-react'

import { enviarSolicitudAmistad } from '@/lib/friends'
import { obtenerMembresiaDeUsuario, type ServerRole } from '@/lib/members'
import { obtenerPerfilPublico, type PublicProfile } from '@/lib/profiles'
import { getErrorMessage } from '@/lib/utils'
import type { ServerItem, UserStatus } from '@/lib/types'
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfigurarPerfilDialog } from '@/components/ConfigurarPerfilDialog'

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

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface UserProfileCardProps {
  userId: string
  server: ServerItem
  currentUserId: string
  children: React.ReactNode
  onMessageUser?: (userId: string) => void
}

export function UserProfileCard({
  userId,
  server,
  currentUserId,
  children,
  onMessageUser,
}: UserProfileCardProps) {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [membresia, setMembresia] = useState<{
    role: ServerRole | null
    joinedAt: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [friendRequestSent, setFriendRequestSent] = useState(false)
  const [friendRequestError, setFriendRequestError] = useState<string | null>(null)

  async function handleAddFriend() {
    setFriendRequestError(null)
    try {
      await enviarSolicitudAmistad(userId)
      setFriendRequestSent(true)
    } catch (err) {
      setFriendRequestError(getErrorMessage(err))
    }
  }

  const isOwnProfile = userId === currentUserId
  const isServerOwner = userId === server.ownerId

  useEffect(() => {
    if (!open) return
    let cancelado = false

    Promise.all([
      obtenerPerfilPublico(userId),
      obtenerMembresiaDeUsuario(server.id, userId),
    ])
      .then(([p, m]) => {
        if (cancelado) return
        setProfile(p)
        setMembresia(m)
        setError(null)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))

    return () => {
      cancelado = true
    }
  }, [open, userId, server.id])

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent side="right" align="start" className="p-0">
          {loading && (
            <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
          )}
          {error && (
            <p className="p-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && profile && (
            <>
              <div
                className="h-16"
                style={{ backgroundColor: profile.colorBanner }}
              />
              <div className="px-4 pb-4">
                <Avatar className="-mt-8 size-16 ring-4 ring-popover">
                  {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} />}
                  <AvatarFallback className="text-lg">
                    {(profile.nombreCompleto || profile.nombreUsuario)
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                  <AvatarBadge className={statusColor[profile.status]} />
                </Avatar>

                <div className="mt-2 flex items-center gap-1.5">
                  <p className="truncate text-base font-semibold text-foreground">
                    {profile.nombreCompleto || profile.nombreUsuario}
                  </p>
                  {isServerOwner && (
                    <Crown className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  @{profile.nombreUsuario} · {statusLabel[profile.status]}
                </p>

                {membresia?.role && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Rol
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: membresia.role.color ?? '#9ca3af',
                        }}
                      />
                      {membresia.role.nombre}
                    </span>
                  </div>
                )}

                {profile.biografia && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Acerca de mí
                    </p>
                    <p className="mt-1 text-sm break-words whitespace-pre-wrap text-foreground/90">
                      {profile.biografia}
                    </p>
                  </div>
                )}

                <div className="mt-3">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Miembro desde
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">
                    {formatFecha(membresia?.joinedAt ?? profile.creadoAt)}
                  </p>
                </div>

                <div className="mt-4 border-t border-border pt-3">
                  {isOwnProfile ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setEditOpen(true)
                        setOpen(false)
                      }}
                    >
                      Editar perfil
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-2">
                        {onMessageUser ? (
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              onMessageUser(userId)
                              setOpen(false)
                            }}
                          >
                            <MessageSquare className="size-4" />
                            Mensaje
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex-1">
                                <Button variant="outline" className="w-full" disabled>
                                  <MessageSquare className="size-4" />
                                  Mensaje
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              No se puede enviar un mensaje directo desde acá.
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Button
                          variant="outline"
                          className="flex-1"
                          disabled={friendRequestSent}
                          onClick={handleAddFriend}
                        >
                          {friendRequestSent ? (
                            <Check className="size-4" />
                          ) : (
                            <UserPlus className="size-4" />
                          )}
                          {friendRequestSent ? 'Enviada' : 'Agregar'}
                        </Button>
                      </div>
                      {friendRequestError && (
                        <p className="text-xs text-destructive" role="alert">
                          {friendRequestError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {isOwnProfile && (
        <ConfigurarPerfilDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          userId={userId}
          onProfileUpdated={() => {
            obtenerPerfilPublico(userId)
              .then(setProfile)
              .catch(() => {})
          }}
        />
      )}
    </>
  )
}

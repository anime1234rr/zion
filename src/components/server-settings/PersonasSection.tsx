import { useEffect, useMemo, useState } from 'react'
import { Ban, ChevronDown, Clock, Crown, MoreHorizontal, Pencil, UserX, Volume2 } from 'lucide-react'

import {
  actualizarApodoMiembro,
  actualizarRolDeMiembro,
  banearMiembro,
  desbanearMiembro,
  displayMemberName,
  expulsarMiembro,
  listarBaneados,
  listarMiembros,
  listarRolesDeServidor,
  quitarSilencioMiembro,
  silenciarMiembro,
  suscribirseAMiembrosDeServidor,
  suscribirseARolesDeServidor,
  type BannedMember,
  type ServerMember,
  type ServerRole,
} from '@/lib/members'
import { cn, getErrorMessage } from '@/lib/utils'
import { useServerPermissions } from '@/hooks/use-server-permissions'
import type { ServerItem, UserStatus } from '@/lib/types'
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmarAccionDialog } from '@/components/server-settings/ConfirmarAccionDialog'
import { BanMemberDialog } from '@/components/server-settings/BanMemberDialog'
import { EditNicknameDialog } from '@/components/server-settings/EditNicknameDialog'
import { UserProfileCard } from '@/components/UserProfileCard'

const DURACIONES_SILENCIO = [
  { label: '10 minutos', minutos: 10 },
  { label: '1 hora', minutos: 60 },
  { label: '1 día', minutos: 60 * 24 },
  { label: '1 semana', minutos: 60 * 24 * 7 },
]

function estaSilenciado(member: ServerMember): boolean {
  return Boolean(member.silencedUntil) && new Date(member.silencedUntil as string).getTime() > Date.now()
}

function calcularSilenciadoHasta(minutos: number): string {
  return new Date(Date.now() + minutos * 60_000).toISOString()
}

const statusColor: Record<UserStatus, string> = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-muted-foreground/60',
}

interface PersonasSectionProps {
  server: ServerItem
  currentUserId: string
}

type Tab = 'miembros' | 'baneados'

export function PersonasSection({ server, currentUserId }: PersonasSectionProps) {
  const { isOwner, hasPermission } = useServerPermissions(server, currentUserId)
  const canManageRoles = hasPermission('gestionar_roles')
  const canExpelMembers = isOwner || hasPermission('expulsar_miembros')
  const canBanMembers = isOwner || hasPermission('banear_miembros')
  const canTimeoutMembers = isOwner || hasPermission('silenciar_miembros')
  const canManageNicknames = isOwner || hasPermission('gestionar_apodos')
  const [tab, setTab] = useState<Tab>('miembros')
  const [members, setMembers] = useState<ServerMember[]>([])
  const [roles, setRoles] = useState<ServerRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expelTarget, setExpelTarget] = useState<ServerMember | null>(null)
  const [banTarget, setBanTarget] = useState<ServerMember | null>(null)
  const [nicknameTarget, setNicknameTarget] = useState<ServerMember | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [bannedMembers, setBannedMembers] = useState<BannedMember[]>([])
  const [bannedLoading, setBannedLoading] = useState(false)
  const [bannedError, setBannedError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    function cargar() {
      return Promise.all([listarMiembros(server.id), listarRolesDeServidor(server.id)])
        .then(([m, r]) => {
          if (cancelado) return
          setMembers(m)
          setRoles(r)
        })
        .catch((err) => !cancelado && setError(getErrorMessage(err)))
    }

    cargar().finally(() => !cancelado && setLoading(false))

    const unsubMiembros = suscribirseAMiembrosDeServidor(server.id, cargar)
    const unsubRoles = suscribirseARolesDeServidor(server.id, cargar)

    return () => {
      cancelado = true
      unsubMiembros()
      unsubRoles()
    }
  }, [server.id])

  useEffect(() => {
    if (tab !== 'baneados' || !canBanMembers) return

    let cancelado = false

    function cargar() {
      return Promise.resolve()
        .then(() => {
          if (cancelado) return undefined
          setBannedLoading(true)
          setBannedError(null)
        })
        .then(() => listarBaneados(server.id))
        .then((data) => !cancelado && setBannedMembers(data))
        .catch((err) => !cancelado && setBannedError(getErrorMessage(err)))
        .finally(() => !cancelado && setBannedLoading(false))
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [tab, canBanMembers, server.id])

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aOffline = a.user.status === 'offline' ? 1 : 0
      const bOffline = b.user.status === 'offline' ? 1 : 0
      return aOffline - bOffline
    })
  }, [members])

  async function handleAssignRole(member: ServerMember, role: ServerRole) {
    if (member.role?.id === role.id) return
    setActionError(null)
    const previous = members
    setMembers((prev) =>
      prev.map((m) => (m.membershipId === member.membershipId ? { ...m, role } : m))
    )
    try {
      await actualizarRolDeMiembro(member.membershipId, role.id)
    } catch (err) {
      setMembers(previous)
      setActionError(getErrorMessage(err))
    }
  }

  async function handleSilenciar(member: ServerMember, minutos: number) {
    setActionError(null)
    const hasta = calcularSilenciadoHasta(minutos)
    const previous = members
    setMembers((prev) =>
      prev.map((m) => (m.membershipId === member.membershipId ? { ...m, silencedUntil: hasta } : m))
    )
    try {
      await silenciarMiembro(member.membershipId, minutos)
    } catch (err) {
      setMembers(previous)
      setActionError(getErrorMessage(err))
    }
  }

  async function handleQuitarSilencio(member: ServerMember) {
    setActionError(null)
    const previous = members
    setMembers((prev) =>
      prev.map((m) => (m.membershipId === member.membershipId ? { ...m, silencedUntil: null } : m))
    )
    try {
      await quitarSilencioMiembro(member.membershipId)
    } catch (err) {
      setMembers(previous)
      setActionError(getErrorMessage(err))
    }
  }

  async function handleUpdateNickname(member: ServerMember, apodo: string) {
    const previous = members
    const nickname = apodo.trim() || null
    setMembers((prev) =>
      prev.map((m) => (m.membershipId === member.membershipId ? { ...m, nickname } : m))
    )
    try {
      await actualizarApodoMiembro(member.membershipId, apodo)
    } catch (err) {
      setMembers(previous)
      throw err
    }
  }

  async function handleDesbanear(banned: BannedMember) {
    setBannedError(null)
    const previous = bannedMembers
    setBannedMembers((prev) => prev.filter((b) => b.id !== banned.id))
    try {
      await desbanearMiembro(server.id, banned.userId)
    } catch (err) {
      setBannedMembers(previous)
      setBannedError(getErrorMessage(err))
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Personas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {members.length} {members.length === 1 ? 'miembro' : 'miembros'} en{' '}
        {server.name}.
      </p>

      <div className="mt-4 flex gap-1 border-b border-border">
        {(
          [
            ['miembros', 'Miembros'],
            ...(canBanMembers ? ([['baneados', 'Baneados']] as const) : []),
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground outline-none hover:text-foreground',
              tab === id && 'border-primary font-medium text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      {loading && (
        <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && tab === 'miembros' && (
        <div className="mt-4 flex flex-col gap-1">
          {sortedMembers.map((member) => {
            const isMemberOwner = member.user.id === server.ownerId
            const offline = member.user.status === 'offline'
            return (
              <div
                key={member.membershipId}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50',
                  offline && 'opacity-60'
                )}
              >
                <UserProfileCard
                  userId={member.user.id}
                  server={server}
                  currentUserId={currentUserId}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Avatar>
                      {member.user.avatarUrl && (
                        <AvatarImage src={member.user.avatarUrl} />
                      )}
                      <AvatarFallback>
                        {displayMemberName(member).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                      <AvatarBadge className={statusColor[member.user.status]} />
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                        {displayMemberName(member)}
                        {isMemberOwner && (
                          <Crown className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        {estaSilenciado(member) && (
                          <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-normal text-muted-foreground">
                            <Clock className="size-3" />
                            Silenciado
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </UserProfileCard>

                {isMemberOwner ? (
                  <span className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Propietario
                  </span>
                ) : !canManageRoles ? (
                  <span className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: member.role?.color ?? '#9ca3af',
                      }}
                    />
                    {member.role?.nombre ?? 'Sin rol'}
                  </span>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: member.role?.color ?? '#9ca3af',
                          }}
                        />
                        {member.role?.nombre ?? 'Sin rol'}
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {roles.length === 0 && (
                        <p className="px-1.5 py-1 text-xs text-muted-foreground">
                          Todavía no hay roles creados.
                        </p>
                      )}
                      {roles.map((role) => (
                        <DropdownMenuItem
                          key={role.id}
                          onSelect={() => handleAssignRole(member, role)}
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: role.color ?? '#9ca3af' }}
                          />
                          {role.nombre}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {(() => {
                  const showModerationActions =
                    !isMemberOwner &&
                    member.user.id !== currentUserId &&
                    (canExpelMembers || canBanMembers || canTimeoutMembers)
                  const showNicknameAction =
                    member.user.id === currentUserId || (canManageNicknames && !isMemberOwner)

                  if (!showModerationActions && !showNicknameAction) return null

                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Más acciones para ${displayMemberName(member)}`}
                          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {showNicknameAction && (
                          <DropdownMenuItem onSelect={() => setNicknameTarget(member)}>
                            <Pencil className="size-4" />
                            Cambiar apodo
                          </DropdownMenuItem>
                        )}
                        {showModerationActions && canTimeoutMembers && !estaSilenciado(member) && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Clock className="size-4" />
                              Silenciar
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {DURACIONES_SILENCIO.map((duracion) => (
                                <DropdownMenuItem
                                  key={duracion.minutos}
                                  onSelect={() => handleSilenciar(member, duracion.minutos)}
                                >
                                  {duracion.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}
                        {showModerationActions && canTimeoutMembers && estaSilenciado(member) && (
                          <DropdownMenuItem onSelect={() => handleQuitarSilencio(member)}>
                            <Volume2 className="size-4" />
                            Quitar silencio
                          </DropdownMenuItem>
                        )}
                        {showModerationActions && canExpelMembers && (
                          <DropdownMenuItem onSelect={() => setExpelTarget(member)}>
                            <UserX className="size-4" />
                            Expulsar
                          </DropdownMenuItem>
                        )}
                        {showModerationActions && canBanMembers && (
                          <DropdownMenuItem variant="destructive" onSelect={() => setBanTarget(member)}>
                            <Ban className="size-4" />
                            Banear
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

      {expelTarget && (
        <ConfirmarAccionDialog
          open={Boolean(expelTarget)}
          onOpenChange={(next) => {
            if (!next) setExpelTarget(null)
          }}
          title={`Expulsar a ${expelTarget.user.name}`}
          description={`${expelTarget.user.name} va a dejar de ser miembro de ${server.name}. Puede volver a unirse con un enlace de invitación.`}
          confirmLabel="Expulsar"
          onConfirm={async () => {
            await expulsarMiembro(expelTarget.membershipId)
            setExpelTarget(null)
          }}
        />
      )}

      {banTarget && (
        <BanMemberDialog
          open={Boolean(banTarget)}
          onOpenChange={(next) => {
            if (!next) setBanTarget(null)
          }}
          memberName={banTarget.user.name}
          onConfirm={async (razon) => {
            await banearMiembro(banTarget.membershipId, razon)
            setBanTarget(null)
          }}
        />
      )}

      {nicknameTarget && (
        <EditNicknameDialog
          open={Boolean(nicknameTarget)}
          onOpenChange={(next) => {
            if (!next) setNicknameTarget(null)
          }}
          memberName={nicknameTarget.user.name}
          currentNickname={nicknameTarget.nickname ?? ''}
          onConfirm={(apodo) => handleUpdateNickname(nicknameTarget, apodo)}
        />
      )}

      {!loading && !error && tab === 'baneados' && (
        <div className="mt-4 flex flex-col gap-1">
          {bannedLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {bannedError && (
            <p className="text-sm text-destructive" role="alert">
              {bannedError}
            </p>
          )}
          {!bannedLoading && !bannedError && bannedMembers.length === 0 && (
            <p className="text-sm text-muted-foreground">Nadie está baneado en este servidor.</p>
          )}
          {bannedMembers.map((banned) => (
            <div
              key={banned.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
            >
              <Avatar>
                {banned.user.avatarUrl && <AvatarImage src={banned.user.avatarUrl} />}
                <AvatarFallback>{banned.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {banned.user.name}
                </span>
                {banned.reason && (
                  <span className="block truncate text-xs text-muted-foreground">{banned.reason}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => handleDesbanear(banned)}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Desbanear
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

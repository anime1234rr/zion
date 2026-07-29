import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Crown, Plus } from 'lucide-react'

import {
  actualizarRolDeMiembro,
  listarMiembros,
  listarRolesDeServidor,
  suscribirseAMiembrosDeServidor,
  suscribirseARolesDeServidor,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RoleEditorPanel } from '@/components/server-settings/RoleEditorPanel'
import { UserProfileCard } from '@/components/UserProfileCard'

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

type Tab = 'miembros' | 'roles'
type RoleSelection = string | 'new' | 'owner' | null

const OWNER_SYNTHETIC_ROLE_ID = 'owner'

export function PersonasSection({ server, currentUserId }: PersonasSectionProps) {
  const { hasPermission } = useServerPermissions(server, currentUserId)
  const canManageRoles = hasPermission('gestionar_roles')
  const [tab, setTab] = useState<Tab>('miembros')
  const [members, setMembers] = useState<ServerMember[]>([])
  const [roles, setRoles] = useState<ServerRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<RoleSelection>(null)

  useEffect(() => {
    let cancelado = false

    function cargar() {
      return Promise.all([listarMiembros(server.id), listarRolesDeServidor(server.id)])
        .then(([m, r]) => {
          if (cancelado) return
          setMembers(m)
          setRoles(r)
          setSelectedRoleId((prev) =>
            prev && prev !== 'new' && !r.some((rol) => rol.id === prev) ? null : prev
          )
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

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aOffline = a.user.status === 'offline' ? 1 : 0
      const bOffline = b.user.status === 'offline' ? 1 : 0
      return aOffline - bOffline
    })
  }, [members])

  const memberCountByRole = useMemo(() => {
    const counts = new Map<string, number>()
    for (const member of members) {
      if (!member.role) continue
      counts.set(member.role.id, (counts.get(member.role.id) ?? 0) + 1)
    }
    return counts
  }, [members])

  const ownerSyntheticRole: ServerRole = {
    id: OWNER_SYNTHETIC_ROLE_ID,
    nombre: 'Propietario',
    color: '#f5a623',
    esRolBase: false,
    permisos: { admin: true },
  }

  const selectedRole =
    selectedRoleId === OWNER_SYNTHETIC_ROLE_ID
      ? ownerSyntheticRole
      : selectedRoleId && selectedRoleId !== 'new'
        ? (roles.find((r) => r.id === selectedRoleId) ?? null)
        : null

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

  function handleRoleSaved(role: ServerRole) {
    setRoles((prev) => {
      const exists = prev.some((r) => r.id === role.id)
      return exists ? prev.map((r) => (r.id === role.id ? role : r)) : [...prev, role]
    })
    setMembers((prev) =>
      prev.map((m) => (m.role?.id === role.id ? { ...m, role } : m))
    )
    setSelectedRoleId(role.id)
  }

  function handleRoleDeleted(roleId: string) {
    setRoles((prev) => prev.filter((r) => r.id !== roleId))
    setMembers((prev) =>
      prev.map((m) => (m.role?.id === roleId ? { ...m, role: null } : m))
    )
    setSelectedRoleId(null)
  }

  return (
    <div className={tab === 'roles' ? 'max-w-4xl' : 'max-w-2xl'}>
      <h1 className="text-lg font-semibold text-foreground">Personas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {members.length} {members.length === 1 ? 'miembro' : 'miembros'} en{' '}
        {server.name}.
      </p>

      <div className="mt-4 flex gap-1 border-b border-border">
        {(
          [
            ['miembros', 'Miembros'],
            ...(canManageRoles ? ([['roles', 'Roles']] as const) : []),
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
            const isOwner = member.user.id === server.ownerId
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
                        {member.user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                      <AvatarBadge className={statusColor[member.user.status]} />
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                        {member.user.name}
                        {isOwner && (
                          <Crown className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </span>
                    </span>
                  </button>
                </UserProfileCard>

                {isOwner ? (
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
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && tab === 'roles' && canManageRoles && (
        <div className="mt-4 grid grid-cols-[260px_1fr] gap-4">
          <div className="flex flex-col gap-1.5">
            {canManageRoles && (
              <button
                type="button"
                onClick={() => setSelectedRoleId('new')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground outline-none hover:border-solid hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Plus className="size-4" />
                Crear rol
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedRoleId(OWNER_SYNTHETIC_ROLE_ID)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50',
                selectedRoleId === OWNER_SYNTHETIC_ROLE_ID && 'border-border bg-muted/70'
              )}
            >
              <span
                className="h-6 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: ownerSyntheticRole.color ?? '#9ca3af' }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 truncate text-sm text-foreground">
                  <Crown className="size-3.5 shrink-0 text-muted-foreground" />
                  Propietario
                </span>
                <span className="block text-xs text-muted-foreground">1 miembro</span>
              </span>
            </button>

            {roles.length === 0 && (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                El servidor arranca sin roles. Creá el primero.
              </p>
            )}

            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50',
                  selectedRoleId === role.id && 'border-border bg-muted/70'
                )}
              >
                <span
                  className="h-6 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: role.color ?? '#9ca3af' }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">
                    {role.nombre}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {memberCountByRole.get(role.id) ?? 0}{' '}
                    {(memberCountByRole.get(role.id) ?? 0) === 1
                      ? 'miembro'
                      : 'miembros'}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="min-h-[420px]">
            {selectedRoleId ? (
              <RoleEditorPanel
                servidorId={server.id}
                role={selectedRole}
                memberCount={
                  selectedRoleId === OWNER_SYNTHETIC_ROLE_ID
                    ? 1
                    : selectedRole
                      ? (memberCountByRole.get(selectedRole.id) ?? 0)
                      : 0
                }
                canEdit={selectedRoleId === OWNER_SYNTHETIC_ROLE_ID ? false : canManageRoles}
                onClose={() => setSelectedRoleId(null)}
                onSaved={handleRoleSaved}
                onDeleted={handleRoleDeleted}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Elegí un rol para editarlo, o creá uno nuevo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

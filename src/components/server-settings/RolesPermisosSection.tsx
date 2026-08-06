import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Crown, GripVertical, Plus, ShieldCheck } from 'lucide-react'

import {
  listarMiembros,
  listarRolesDeServidor,
  reordenarRoles,
  suscribirseAMiembrosDeServidor,
  suscribirseARolesDeServidor,
  type ServerMember,
  type ServerRole,
} from '@/lib/members'
import { cn, getErrorMessage } from '@/lib/utils'
import { useServerPermissions } from '@/hooks/use-server-permissions'
import type { ServerItem } from '@/lib/types'
import { RoleEditorPanel } from '@/components/server-settings/RoleEditorPanel'

const OWNER_SYNTHETIC_ROLE_ID = 'owner'

interface RolesPermisosSectionProps {
  server: ServerItem
  currentUserId: string
}

type Selection = string | 'new' | typeof OWNER_SYNTHETIC_ROLE_ID | null

function SortableRoleRow({
  role,
  memberCount,
  selected,
  onSelect,
}: {
  role: ServerRole
  memberCount: number
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: role.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1 rounded-lg border border-transparent pr-1 outline-none hover:bg-muted/50',
        selected && 'border-border bg-muted/70'
      )}
    >
      <button
        type="button"
        aria-label={`Reordenar ${role.nombre}`}
        className="flex size-7 shrink-0 touch-none cursor-grab items-center justify-center text-muted-foreground outline-none hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className="h-6 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: role.color ?? '#9ca3af' }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">{role.nombre}</span>
          <span className="block text-xs text-muted-foreground">
            {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
          </span>
        </span>
      </button>
    </li>
  )
}

export function RolesPermisosSection({ server, currentUserId }: RolesPermisosSectionProps) {
  const { isOwner, hasPermission } = useServerPermissions(server, currentUserId)
  const canManageRoles = isOwner || hasPermission('gestionar_roles')

  const [roles, setRoles] = useState<ServerRole[]>([])
  const [members, setMembers] = useState<ServerMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<Selection>(null)

  useEffect(() => {
    let cancelado = false

    function cargar() {
      return Promise.all([listarRolesDeServidor(server.id), listarMiembros(server.id)])
        .then(([r, m]) => {
          if (cancelado) return
          setRoles(r)
          setMembers(m)
          setSelectedRoleId((prev) =>
            prev && prev !== 'new' && prev !== OWNER_SYNTHETIC_ROLE_ID && !r.some((rol) => rol.id === prev)
              ? null
              : prev
          )
        })
        .catch((err) => !cancelado && setError(getErrorMessage(err)))
    }

    cargar().finally(() => !cancelado && setLoading(false))

    const unsubRoles = suscribirseARolesDeServidor(server.id, cargar)
    const unsubMiembros = suscribirseAMiembrosDeServidor(server.id, cargar)

    return () => {
      cancelado = true
      unsubRoles()
      unsubMiembros()
    }
  }, [server.id])

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
    posicion: -1,
    esRolBase: false,
    permisos: { admin: true },
  }

  const selectedRole =
    selectedRoleId === OWNER_SYNTHETIC_ROLE_ID
      ? ownerSyntheticRole
      : selectedRoleId && selectedRoleId !== 'new'
        ? (roles.find((r) => r.id === selectedRoleId) ?? null)
        : null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = roles.findIndex((r) => r.id === active.id)
    const newIndex = roles.findIndex((r) => r.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const previous = roles
    const reordered = arrayMove(roles, oldIndex, newIndex)
    setRoles(reordered)
    setReorderError(null)

    reordenarRoles(reordered.map((role, index) => ({ id: role.id, posicion: index }))).catch(
      (err) => {
        setRoles(previous)
        setReorderError(getErrorMessage(err))
      }
    )
  }

  function handleRoleSaved(role: ServerRole) {
    setRoles((prev) => {
      const exists = prev.some((r) => r.id === role.id)
      return exists ? prev.map((r) => (r.id === role.id ? role : r)) : [...prev, role]
    })
    setSelectedRoleId(role.id)
  }

  function handleRoleDeleted(roleId: string) {
    setRoles((prev) => prev.filter((r) => r.id !== roleId))
    setSelectedRoleId(null)
  }

  if (!loading && !canManageRoles) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-lg font-semibold text-foreground">Roles y Permisos</h1>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" />
          No tenés permiso para gestionar roles en este servidor.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-lg font-semibold text-foreground">Roles y Permisos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Definí la jerarquía de rangos, sus colores y qué puede hacer cada uno. Arrastrá un rol
        desde el ícono de la izquierda para cambiar su posición en la jerarquía.
      </p>

      {loading && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}
      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {reorderError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {reorderError}
        </p>
      )}

      {!loading && !error && (
        <div className="mt-4 grid grid-cols-[280px_1fr] gap-4">
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedRoleId('new')}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground outline-none hover:border-solid hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Plus className="size-4" />
              Crear rol
            </button>

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

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={roles.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col gap-0.5">
                  {roles.map((role) => (
                    <SortableRoleRow
                      key={role.id}
                      role={role}
                      memberCount={memberCountByRole.get(role.id) ?? 0}
                      selected={selectedRoleId === role.id}
                      onSelect={() => setSelectedRoleId(role.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
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
                nextPosicion={roles.length}
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

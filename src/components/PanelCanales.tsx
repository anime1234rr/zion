import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  Code2,
  Eye,
  FolderPlus,
  GripVertical,
  Hash,
  Lock,
  Megaphone,
  MessagesSquare,
  MicOff,
  Plus,
  Settings,
  UserPlus,
  Volume2,
  X as XIcon,
} from 'lucide-react'

import { cn, getErrorMessage } from '@/lib/utils'
import { useResizablePanel } from '@/hooks/use-resizable-panel'
import { useServerPermissions } from '@/hooks/use-server-permissions'
import { useVoiceConnection } from '@/hooks/use-voice-connection'
import {
  isChannelRestricted,
  ACCESO_DENEGADO,
  resolvePreviewPermission,
  type ChannelPreviewPermissions,
} from '@/hooks/use-role-preview'
import {
  UNCATEGORIZED_ID,
  reordenarCanales,
  type ReordenCanal,
} from '@/lib/channels'
import {
  listarParticipantesDeVozDeCanales,
  suscribirseAEstadosVoz,
  type VoiceParticipant,
} from '@/lib/voice'
import type { ServerRole } from '@/lib/members'
import type { ChannelCategory, ChannelItem, ChannelType, ChatUser, ServerItem } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ResizeHandle } from '@/components/ui/resize-handle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PerfilUsuario } from '@/components/PerfilUsuario'
import { ServerSettingsPanel } from '@/components/server-settings/ServerSettingsPanel'
import { InvitarDialog } from '@/components/InvitarDialog'
import { CrearCanalDialog } from '@/components/CrearCanalDialog'
import { CrearCategoriaDialog } from '@/components/CrearCategoriaDialog'
import { CategorySettingsDialog } from '@/components/CategorySettingsDialog'
import { ChannelSettingsDialog } from '@/components/ChannelSettingsDialog'

const channelIcon: Record<ChannelType, typeof Hash> = {
  text: Hash,
  announcement: Megaphone,
  voice: Volume2,
  code: Code2,
  forum: MessagesSquare,
}

function findChannelLocation(cats: ChannelCategory[], channelId: string) {
  for (let categoryIndex = 0; categoryIndex < cats.length; categoryIndex++) {
    const channelIndex = cats[categoryIndex].channels.findIndex((c) => c.id === channelId)
    if (channelIndex !== -1) return { categoryIndex, channelIndex }
  }
  return null
}

interface ChannelRowProps {
  channel: ChannelItem
  active: boolean
  canManage: boolean
  onSelect: () => void
  onEdit: () => void
  restricted?: boolean
}

function ChannelRowContent({ channel, active, canManage, onSelect, onEdit, restricted }: ChannelRowProps) {
  const Icon = channelIcon[channel.type]
  return (
    <>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active}
        aria-disabled={restricted}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none',
          'hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
          active && 'font-medium text-sidebar-accent-foreground',
          restricted && 'cursor-not-allowed opacity-45 hover:text-muted-foreground'
        )}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground group-hover/channel:text-sidebar-accent-foreground" />
        <span className="truncate">{channel.name}</span>
        {restricted && <Lock className="size-3 shrink-0 text-muted-foreground" />}
        {channel.unread && !active && (
          <span className="ml-auto size-1.5 shrink-0 rounded-full bg-foreground" />
        )}
      </button>
      {canManage && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar canal ${channel.name}`}
          className="mr-1 hidden shrink-0 rounded-md p-1 text-muted-foreground outline-none hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 group-hover/channel:block"
        >
          <Settings className="size-3.5" />
        </button>
      )}
    </>
  )
}

function SortableChannelRow({
  channel,
  categoryId,
  footer,
  ...rest
}: ChannelRowProps & { categoryId: string; footer?: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: channel.id,
    data: { type: 'channel', categoryId },
    disabled: !rest.canManage,
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
        'group/channel touch-none rounded-md transition-colors',
        'hover:bg-sidebar-accent',
        rest.active && 'bg-sidebar-accent'
      )}
    >
      <div className="flex items-center" {...attributes} {...listeners}>
        <ChannelRowContent channel={channel} {...rest} />
      </div>
      {footer}
    </li>
  )
}

function VoiceChannelMembers({
  participants,
  speakingUserIds,
}: {
  participants: VoiceParticipant[]
  speakingUserIds: Set<string>
}) {
  return (
    <ul className="ml-6 flex flex-col gap-0.5 pb-1.5">
      {participants.map((participant) => (
        <li key={participant.user.id} className="flex items-center gap-1.5 px-2 py-0.5">
          <Avatar
            size="sm"
            className={cn(
              !participant.muted && speakingUserIds.has(participant.user.id) && 'ring-2 ring-online'
            )}
          >
            {participant.user.avatarUrl && <AvatarImage src={participant.user.avatarUrl} />}
            <AvatarFallback>{participant.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {participant.user.name}
          </span>
          {participant.muted && <MicOff className="size-3 shrink-0 text-muted-foreground" />}
        </li>
      ))}
    </ul>
  )
}

function categoryDropZoneId(categoryId: string) {
  return `dropzone:${categoryId}`
}

function SortableCategoryBlock({
  category,
  isCollapsed,
  canManage,
  onToggle,
  onCreateChannel,
  onEditCategory,
  children,
}: {
  category: ChannelCategory
  isCollapsed: boolean
  canManage: boolean
  onToggle: () => void
  onCreateChannel: () => void
  onEditCategory: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    data: { type: 'category' },
    disabled: !canManage,
    animateLayoutChanges: () => false,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <div className="group/category flex items-center gap-1" {...attributes} {...listeners}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!isCollapsed}
          className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase outline-none hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronDown
            className={cn(
              'size-3 shrink-0 transition-transform duration-150',
              isCollapsed && '-rotate-90'
            )}
          />
          <span className="truncate">{category.name}</span>
        </button>
        {canManage && (
          <button
            type="button"
            onClick={onCreateChannel}
            aria-label={`Crear canal en ${category.name}`}
            className="hidden shrink-0 rounded-md p-1 text-muted-foreground outline-none hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 group-hover/category:block"
          >
            <Plus className="size-3.5" />
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={onEditCategory}
            aria-label={`Editar categoría ${category.name}`}
            className="hidden shrink-0 rounded-md p-1 text-muted-foreground outline-none hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 group-hover/category:block"
          >
            <Settings className="size-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function CategoryDropZone({
  category,
  activeChannelId,
  canManage,
  onSelectChannel,
  onEditChannel,
  voiceRoster,
  connectedVoiceChannelId,
  speakingUserIds,
  previewPermissionsByChannel,
}: {
  category: ChannelCategory
  activeChannelId: string
  canManage: boolean
  onSelectChannel: (channelId: string) => void
  onEditChannel: (channel: ChannelItem) => void
  voiceRoster: Record<string, VoiceParticipant[]>
  connectedVoiceChannelId: string | null
  speakingUserIds: Set<string>
  previewPermissionsByChannel?: Record<string, ChannelPreviewPermissions>
}) {
  const { setNodeRef } = useDroppable({
    id: categoryDropZoneId(category.id),
    data: { type: 'category' },
  })

  return (
    <SortableContext
      items={category.channels.map((c) => c.id)}
      strategy={verticalListSortingStrategy}
    >
      <ul ref={setNodeRef} className="mt-0.5 flex min-h-2 flex-col gap-0.5">
        {category.channels.map((channel) => {
          const participants = channel.type === 'voice' ? voiceRoster[channel.id] : undefined
          const previewPermissions = previewPermissionsByChannel?.[channel.id]
          const restricted = previewPermissions ? isChannelRestricted(previewPermissions) : false
          return (
            <SortableChannelRow
              key={channel.id}
              channel={channel}
              categoryId={category.id}
              active={channel.id === activeChannelId}
              canManage={canManage}
              onSelect={restricted ? () => {} : () => onSelectChannel(channel.id)}
              onEdit={() => onEditChannel(channel)}
              restricted={restricted}
              footer={
                participants && participants.length > 0 ? (
                  <VoiceChannelMembers
                    participants={participants}
                    speakingUserIds={
                      connectedVoiceChannelId === channel.id ? speakingUserIds : EMPTY_SPEAKING_SET
                    }
                  />
                ) : undefined
              }
            />
          )
        })}
      </ul>
    </SortableContext>
  )
}

const EMPTY_SPEAKING_SET = new Set<string>()

export interface RolePreviewData {
  loading: boolean
  permissionsByChannel: Record<string, ChannelPreviewPermissions>
}

interface PanelCanalesProps {
  server: ServerItem
  categories: ChannelCategory[]
  activeChannelId: string
  onSelectChannel: (channelId: string) => void
  currentUser: ChatUser
  onSignOut?: () => void
  onProfileUpdated?: (user: ChatUser) => void
  onServerUpdated?: (server: ServerItem) => void
  onServerDeleted?: (serverId: string) => void
  onChannelCreated?: () => void
  onChannelUpdated?: () => void
  onChannelDeleted?: (channelId: string) => void
  previewRole?: ServerRole | null
  rolePreview?: RolePreviewData
  onPreviewAsRole?: (role: ServerRole) => void
  onExitPreview?: () => void
}

export function PanelCanales({
  server,
  categories,
  activeChannelId,
  onSelectChannel,
  currentUser,
  onProfileUpdated,
  onSignOut,
  onServerUpdated,
  onServerDeleted,
  onChannelCreated,
  onChannelUpdated,
  onChannelDeleted,
  previewRole,
  rolePreview,
  onPreviewAsRole,
  onExitPreview,
}: PanelCanalesProps) {
  const preview = rolePreview ?? { loading: false, permissionsByChannel: {} }
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [createChannelTarget, setCreateChannelTarget] = useState<{
    categoriaId: string | null
    posicion: number
  } | null>(null)
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<ChannelItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<ChannelCategory | null>(null)
  const [localCategories, setLocalCategories] = useState(categories)
  const [activeDragChannel, setActiveDragChannel] = useState<ChannelItem | null>(null)
  const [activeDragCategory, setActiveDragCategory] = useState<ChannelCategory | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const isDraggingRef = useRef(false)
  const dragSnapshotRef = useRef<ChannelCategory[] | null>(null)
  const { width, resizing, handlePointerDown } = useResizablePanel({
    storageKey: 'zion:panel-canales-width',
    defaultWidth: 240,
    minWidth: 180,
    maxWidth: 400,
    edge: 'right',
  })
  const { hasPermission: realHasPermission } = useServerPermissions(server, currentUser.id)
  const isPreviewing = Boolean(previewRole)
  const hasPermission = isPreviewing
    ? (permiso: string) => resolvePreviewPermission(previewRole, permiso)
    : realHasPermission
  const puedeGestionarServidor =
    hasPermission('gestionar_servidor') ||
    hasPermission('gestionar_canales') ||
    hasPermission('gestionar_roles')
  const puedeGestionarCanales = hasPermission('gestionar_canales')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  const { connectedChannelId, speakingUserIds } = useVoiceConnection()
  const [voiceRoster, setVoiceRoster] = useState<Record<string, VoiceParticipant[]>>({})
  const voiceChannelIds = useMemo(
    () => categories.flatMap((cat) => cat.channels.filter((c) => c.type === 'voice').map((c) => c.id)),
    [categories]
  )
  const sortableCategoryIds = useMemo(
    () => localCategories.filter((cat) => cat.id !== UNCATEGORIZED_ID).map((cat) => cat.id),
    [localCategories]
  )

  useEffect(() => {
    let cancelado = false

    async function refresh() {
      try {
        const participants = await listarParticipantesDeVozDeCanales(voiceChannelIds)
        if (cancelado) return
        const grouped: Record<string, VoiceParticipant[]> = {}
        for (const participant of participants) {
          const lista = grouped[participant.canalId] ?? []
          lista.push(participant)
          grouped[participant.canalId] = lista
        }
        setVoiceRoster(grouped)
      } catch (err) {
        console.error('No se pudo cargar quién está conectado a los canales de voz', err)
      }
    }

    refresh()
    const unsubscribers = voiceChannelIds.map((id) => suscribirseAEstadosVoz(id, { onCambio: refresh }))

    return () => {
      cancelado = true
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [voiceChannelIds])

  useEffect(() => {
    if (isDraggingRef.current) return
    setLocalCategories(categories)
  }, [categories])

  useEffect(() => {
    if (!previewRole || preview.loading) return

    const channels = localCategories.flatMap((category) => category.channels)
    const activeChannel = channels.find((channel) => channel.id === activeChannelId)
    const activeRestricted =
      !activeChannel ||
      isChannelRestricted(preview.permissionsByChannel[activeChannel.id] ?? ACCESO_DENEGADO)

    if (!activeRestricted) return

    const accesible = channels.find(
      (channel) => !isChannelRestricted(preview.permissionsByChannel[channel.id] ?? ACCESO_DENEGADO)
    )

    if (accesible) onSelectChannel(accesible.id)
  }, [previewRole, preview.loading, preview.permissionsByChannel, activeChannelId, localCategories, onSelectChannel])

  function toggleCategory(categoryId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  function handleDragStart(event: DragStartEvent) {
    if (!puedeGestionarCanales) return
    isDraggingRef.current = true
    dragSnapshotRef.current = localCategories
    setReorderError(null)

    if (event.active.data.current?.type === 'category') {
      const category = localCategories.find((cat) => cat.id === event.active.id)
      if (category) setActiveDragCategory(category)
      return
    }

    const loc = findChannelLocation(localCategories, String(event.active.id))
    if (loc) setActiveDragChannel(localCategories[loc.categoryIndex].channels[loc.channelIndex])
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    if (active.data.current?.type === 'category') {
      return
    }

    setLocalCategories((prev) => {
      const activeLoc = findChannelLocation(prev, activeId)
      if (!activeLoc) return prev

      let overCategoryIndex = prev.findIndex(
        (cat) => cat.id === overId || categoryDropZoneId(cat.id) === overId
      )
      let overChannelIndex = -1
      if (overCategoryIndex === -1) {
        const overLoc = findChannelLocation(prev, overId)
        if (!overLoc) return prev
        overCategoryIndex = overLoc.categoryIndex
        overChannelIndex = overLoc.channelIndex
      }

      if (activeLoc.categoryIndex === overCategoryIndex) {
        if (overChannelIndex === -1 || overChannelIndex === activeLoc.channelIndex) return prev
        const next = [...prev]
        next[activeLoc.categoryIndex] = {
          ...next[activeLoc.categoryIndex],
          channels: arrayMove(
            next[activeLoc.categoryIndex].channels,
            activeLoc.channelIndex,
            overChannelIndex
          ),
        }
        return next
      }

      const next = prev.map((cat) => ({ ...cat, channels: [...cat.channels] }))
      const [moved] = next[activeLoc.categoryIndex].channels.splice(activeLoc.channelIndex, 1)
      const insertAt =
        overChannelIndex === -1 ? next[overCategoryIndex].channels.length : overChannelIndex
      next[overCategoryIndex].channels.splice(insertAt, 0, moved)
      return next
    })
  }

  async function persistOrder(cats: ChannelCategory[]) {
    const cambios: ReordenCanal[] = []
    cats.forEach((category) => {
      const categoriaId = category.id === UNCATEGORIZED_ID ? null : category.id
      category.channels.forEach((channel, index) => {
        cambios.push({ canalId: channel.id, categoriaId, posicion: index })
      })
    })

    try {
      await reordenarCanales(server.id, cambios)
      onChannelUpdated?.()
    } catch (err) {
      setReorderError(getErrorMessage(err))
      if (dragSnapshotRef.current) setLocalCategories(dragSnapshotRef.current)
    }
  }

  async function persistCategoryOrder(cats: ChannelCategory[]) {
    const cambios: ReordenCanal[] = []
    let posicion = 0
    cats.forEach((category) => {
      if (category.id === UNCATEGORIZED_ID) return
      cambios.push({ canalId: category.id, categoriaId: null, posicion })
      posicion += 1
    })

    try {
      await reordenarCanales(server.id, cambios)
      onChannelUpdated?.()
    } catch (err) {
      setReorderError(getErrorMessage(err))
      if (dragSnapshotRef.current) setLocalCategories(dragSnapshotRef.current)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false
    const wasCategory = event.active.data.current?.type === 'category'
    setActiveDragChannel(null)
    setActiveDragCategory(null)
    if (!event.over) {
      dragSnapshotRef.current = null
      return
    }

    if (wasCategory) {
      const activeId = String(event.active.id)
      const overId = String(event.over.id)
      setLocalCategories((prev) => {
        const activeIndex = prev.findIndex((cat) => cat.id === activeId)
        let overIndex = prev.findIndex((cat) => cat.id === overId)
        if (overIndex === -1) {
          overIndex = prev.findIndex((cat) => categoryDropZoneId(cat.id) === overId)
        }
        if (overIndex === -1) {
          const channelLoc = findChannelLocation(prev, overId)
          if (channelLoc) overIndex = channelLoc.categoryIndex
        }
        if (activeIndex === -1 || overIndex === -1 || prev[overIndex].id === UNCATEGORIZED_ID) {
          return prev
        }
        const next = arrayMove(prev, activeIndex, overIndex)
        persistCategoryOrder(next)
        return next
      })
      dragSnapshotRef.current = null
      return
    }

    setLocalCategories((current) => {
      persistOrder(current)
      return current
    })
    dragSnapshotRef.current = null
  }

  function handleDragCancel() {
    isDraggingRef.current = false
    setActiveDragChannel(null)
    setActiveDragCategory(null)
    if (dragSnapshotRef.current) setLocalCategories(dragSnapshotRef.current)
    dragSnapshotRef.current = null
  }

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
      style={{ width }}
    >
      <ResizeHandle edge="right" active={resizing} onPointerDown={handlePointerDown} />

      {server.bannerUrl && (
        <img src={server.bannerUrl} alt="" className="h-28 w-full shrink-0 object-cover" />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-12 shrink-0 items-center justify-between border-b border-sidebar-border px-4 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="truncate text-sm font-semibold text-sidebar-foreground">
              {server.name}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onSelect={() => setInviteOpen(true)}>
            <UserPlus className="size-4" />
            Invitar personas
          </DropdownMenuItem>
          {puedeGestionarServidor && (
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
              <Settings className="size-4" />
              Configuración del servidor
            </DropdownMenuItem>
          )}
          {puedeGestionarCanales && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setCreateChannelTarget({ categoriaId: null, posicion: 0 })}
              >
                <Plus className="size-4" />
                Crear canal
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCreateCategoryOpen(true)}>
                <FolderPlus className="size-4" />
                Crear categoría
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {previewRole && (
        <div
          className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2"
          style={{ backgroundColor: `${previewRole.color ?? '#9ca3af'}1a` }}
        >
          <Eye className="size-3.5 shrink-0" style={{ color: previewRole.color ?? undefined }} />
          <p className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground">
            Viendo como{' '}
            <span className="font-semibold" style={{ color: previewRole.color ?? undefined }}>
              {previewRole.nombre}
            </span>
          </p>
          <button
            type="button"
            onClick={onExitPreview}
            aria-label="Salir de la vista previa"
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      )}

      {reorderError && (
        <p className="border-b border-sidebar-border px-3 py-1.5 text-xs text-destructive" role="alert">
          {reorderError}
        </p>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
          autoScroll={false}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <nav aria-label="Canales" className="flex flex-col gap-3 px-2 py-3">
            <SortableContext items={sortableCategoryIds} strategy={verticalListSortingStrategy}>
              {localCategories.map((category) => {
                const isUncategorized = category.id === UNCATEGORIZED_ID
                const isCollapsed = !isUncategorized && collapsed.has(category.id)
                const dropZone = (isUncategorized || !isCollapsed) && (
                  <CategoryDropZone
                    category={category}
                    activeChannelId={activeChannelId}
                    canManage={puedeGestionarCanales}
                    onSelectChannel={onSelectChannel}
                    onEditChannel={setEditingChannel}
                    voiceRoster={voiceRoster}
                    connectedVoiceChannelId={connectedChannelId}
                    speakingUserIds={speakingUserIds}
                    previewPermissionsByChannel={
                      previewRole && !preview.loading ? preview.permissionsByChannel : undefined
                    }
                  />
                )

                if (isUncategorized) {
                  return <div key={category.id}>{dropZone}</div>
                }

                return (
                  <SortableCategoryBlock
                    key={category.id}
                    category={category}
                    isCollapsed={isCollapsed}
                    canManage={puedeGestionarCanales}
                    onToggle={() => toggleCategory(category.id)}
                    onCreateChannel={() =>
                      setCreateChannelTarget({
                        categoriaId: category.id,
                        posicion: category.channels.length,
                      })
                    }
                    onEditCategory={() => setEditingCategory(category)}
                  >
                    {dropZone}
                  </SortableCategoryBlock>
                )
              })}
            </SortableContext>
          </nav>

          <DragOverlay>
            {activeDragChannel && (
              <div className="flex items-center gap-1.5 rounded-md bg-sidebar-accent px-2 py-1.5 text-sm text-sidebar-accent-foreground shadow-lg">
                <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
                {(() => {
                  const Icon = channelIcon[activeDragChannel.type]
                  return <Icon className="size-4 shrink-0" />
                })()}
                <span className="truncate">{activeDragChannel.name}</span>
              </div>
            )}
            {activeDragCategory && (
              <div className="flex items-center gap-1.5 rounded-md bg-sidebar-accent px-1.5 py-1 text-xs font-semibold tracking-wide text-sidebar-accent-foreground uppercase shadow-lg">
                <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{activeDragCategory.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </ScrollArea>

      <PerfilUsuario
        user={currentUser}
        onSignOut={onSignOut}
        onProfileUpdated={onProfileUpdated}
      />

      <ServerSettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        server={server}
        currentUserId={currentUser.id}
        backgroundUrl={currentUser.backgroundUrl}
        backgroundType={currentUser.backgroundType}
        onServerUpdated={(updated) => onServerUpdated?.(updated)}
        onServerDeleted={onServerDeleted}
        onPreviewAsRole={(role) => {
          setSettingsOpen(false)
          onPreviewAsRole?.(role)
        }}
      />

      <InvitarDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        serverName={server.name}
        inviteCode={server.inviteCode}
      />

      <CrearCanalDialog
        open={createChannelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCreateChannelTarget(null)
        }}
        servidorId={server.id}
        categoriaId={createChannelTarget?.categoriaId}
        posicion={createChannelTarget?.posicion}
        onCreated={() => onChannelCreated?.()}
      />

      <CrearCategoriaDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        servidorId={server.id}
        onCreated={() => onChannelCreated?.()}
      />

      <ChannelSettingsDialog
        open={editingChannel !== null}
        onOpenChange={(open) => {
          if (!open) setEditingChannel(null)
        }}
        servidorId={server.id}
        channel={editingChannel}
        onUpdated={(updated) => {
          onChannelUpdated?.()
          setEditingChannel(updated)
        }}
        onDeleted={(channelId) => {
          onChannelDeleted?.(channelId)
          setEditingChannel(null)
        }}
      />

      <CategorySettingsDialog
        open={editingCategory !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null)
        }}
        servidorId={server.id}
        category={editingCategory}
        onDeleted={(categoryId) => {
          onChannelDeleted?.(categoryId)
          setEditingCategory(null)
        }}
        onChannelCreated={() => onChannelCreated?.()}
      />
    </aside>
  )
}

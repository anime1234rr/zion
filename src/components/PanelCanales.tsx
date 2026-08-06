import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
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
  FolderPlus,
  GripVertical,
  Hash,
  Megaphone,
  MicOff,
  Plus,
  Settings,
  UserPlus,
  Volume2,
} from 'lucide-react'

import { cn, getErrorMessage } from '@/lib/utils'
import { useResizablePanel } from '@/hooks/use-resizable-panel'
import { useServerPermissions } from '@/hooks/use-server-permissions'
import { useVoiceConnection } from '@/hooks/use-voice-connection'
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
import { ChannelSettingsDialog } from '@/components/ChannelSettingsDialog'

const channelIcon: Record<ChannelType, typeof Hash> = {
  text: Hash,
  announcement: Megaphone,
  voice: Volume2,
  code: Code2,
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
}

function ChannelRowContent({ channel, active, canManage, onSelect, onEdit }: ChannelRowProps) {
  const Icon = channelIcon[channel.type]
  return (
    <>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none',
          'hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
          active && 'font-medium text-sidebar-accent-foreground'
        )}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground group-hover/channel:text-sidebar-accent-foreground" />
        <span className="truncate">{channel.name}</span>
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

function CategoryDropZone({
  category,
  activeChannelId,
  canManage,
  onSelectChannel,
  onEditChannel,
  voiceRoster,
  connectedVoiceChannelId,
  speakingUserIds,
}: {
  category: ChannelCategory
  activeChannelId: string
  canManage: boolean
  onSelectChannel: (channelId: string) => void
  onEditChannel: (channel: ChannelItem) => void
  voiceRoster: Record<string, VoiceParticipant[]>
  connectedVoiceChannelId: string | null
  speakingUserIds: Set<string>
}) {
  const { setNodeRef } = useDroppable({ id: category.id, data: { type: 'category' } })

  return (
    <SortableContext
      items={category.channels.map((c) => c.id)}
      strategy={verticalListSortingStrategy}
    >
      <ul ref={setNodeRef} className="mt-0.5 flex min-h-2 flex-col gap-0.5">
        {category.channels.map((channel) => {
          const participants = channel.type === 'voice' ? voiceRoster[channel.id] : undefined
          return (
            <SortableChannelRow
              key={channel.id}
              channel={channel}
              categoryId={category.id}
              active={channel.id === activeChannelId}
              canManage={canManage}
              onSelect={() => onSelectChannel(channel.id)}
              onEdit={() => onEditChannel(channel)}
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
}: PanelCanalesProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [createChannelOpen, setCreateChannelOpen] = useState(false)
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<ChannelItem | null>(null)
  const [localCategories, setLocalCategories] = useState(categories)
  const [activeDragChannel, setActiveDragChannel] = useState<ChannelItem | null>(null)
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
  const { hasPermission } = useServerPermissions(server, currentUser.id)
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
    const loc = findChannelLocation(localCategories, String(event.active.id))
    if (loc) setActiveDragChannel(localCategories[loc.categoryIndex].channels[loc.channelIndex])
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    setLocalCategories((prev) => {
      const activeLoc = findChannelLocation(prev, activeId)
      if (!activeLoc) return prev

      let overCategoryIndex = prev.findIndex((cat) => cat.id === overId)
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

  function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false
    setActiveDragChannel(null)
    if (!event.over) {
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
              <DropdownMenuItem onSelect={() => setCreateChannelOpen(true)}>
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

      {reorderError && (
        <p className="border-b border-sidebar-border px-3 py-1.5 text-xs text-destructive" role="alert">
          {reorderError}
        </p>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <nav aria-label="Canales" className="flex flex-col gap-3 px-2 py-3">
            {localCategories.map((category) => {
              const isUncategorized = category.id === UNCATEGORIZED_ID
              const isCollapsed = !isUncategorized && collapsed.has(category.id)
              return (
                <div key={category.id}>
                  {!isUncategorized && (
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      aria-expanded={!isCollapsed}
                      className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase outline-none hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <ChevronDown
                        className={cn(
                          'size-3 shrink-0 transition-transform duration-150',
                          isCollapsed && '-rotate-90'
                        )}
                      />
                      <span className="truncate">{category.name}</span>
                    </button>
                  )}

                  {(isUncategorized || !isCollapsed) && (
                    <CategoryDropZone
                      category={category}
                      activeChannelId={activeChannelId}
                      canManage={puedeGestionarCanales}
                      onSelectChannel={onSelectChannel}
                      onEditChannel={setEditingChannel}
                      voiceRoster={voiceRoster}
                      connectedVoiceChannelId={connectedChannelId}
                      speakingUserIds={speakingUserIds}
                    />
                  )}
                </div>
              )
            })}
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
      />

      <InvitarDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        serverName={server.name}
        inviteCode={server.inviteCode}
      />

      <CrearCanalDialog
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
        servidorId={server.id}
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
        onUpdated={() => {
          onChannelUpdated?.()
          setEditingChannel(null)
        }}
        onDeleted={(channelId) => {
          onChannelDeleted?.(channelId)
          setEditingChannel(null)
        }}
      />
    </aside>
  )
}

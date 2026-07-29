import { useState } from 'react'
import {
  ChevronDown,
  Code2,
  Hash,
  Megaphone,
  Plus,
  Settings,
  UserPlus,
  Volume2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useResizablePanel } from '@/hooks/use-resizable-panel'
import { useServerPermissions } from '@/hooks/use-server-permissions'
import type { ChannelCategory, ChannelItem, ChannelType, ChatUser, ServerItem } from '@/lib/types'
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
import { ChannelSettingsDialog } from '@/components/ChannelSettingsDialog'

const channelIcon: Record<ChannelType, typeof Hash> = {
  text: Hash,
  announcement: Megaphone,
  voice: Volume2,
  code: Code2,
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
  const [editingChannel, setEditingChannel] = useState<ChannelItem | null>(null)
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

  function toggleCategory(categoryId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
      style={{ width }}
    >
      <ResizeHandle edge="right" active={resizing} onPointerDown={handlePointerDown} />
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
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ScrollArea className="flex-1">
        <nav aria-label="Canales" className="flex flex-col gap-3 px-2 py-3">
          {categories.map((category) => {
            const isCollapsed = collapsed.has(category.id)
            return (
              <div key={category.id}>
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

                {!isCollapsed && (
                  <ul className="mt-0.5 flex flex-col gap-0.5">
                    {category.channels.map((channel) => {
                      const Icon = channelIcon[channel.type]
                      const active = channel.id === activeChannelId
                      return (
                        <li
                          key={channel.id}
                          className={cn(
                            'group/channel flex items-center rounded-md transition-colors',
                            'hover:bg-sidebar-accent',
                            active && 'bg-sidebar-accent'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectChannel(channel.id)}
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
                          {puedeGestionarCanales && (
                            <button
                              type="button"
                              onClick={() => setEditingChannel(channel)}
                              aria-label={`Editar canal ${channel.name}`}
                              className="mr-1 hidden shrink-0 rounded-md p-1 text-muted-foreground outline-none hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 group-hover/channel:block"
                            >
                              <Settings className="size-3.5" />
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>
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

import { useEffect, useMemo, useState } from 'react'
import { MessageSquare, MessagesSquare, Pin, Plus, Tag } from 'lucide-react'

import {
  listarEtiquetasDeForo,
  listarHilosDeForo,
  suscribirseAHilosDeForo,
  type ForumTag,
  type ForumThread,
} from '@/lib/forums'
import { useChannelPermissions } from '@/hooks/use-channel-permissions'
import { useServerPermissions } from '@/hooks/use-server-permissions'
import { getErrorMessage } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ChannelItem, ServerItem } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CrearHiloForoDialog } from '@/components/forum/CrearHiloForoDialog'
import { ForumTagsDialog } from '@/components/forum/ForumTagsDialog'
import { ForumThreadView } from '@/components/forum/ForumThreadView'

type Orden = 'actividad' | 'nuevos'

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `hace ${diffD} d`
  return new Date(iso).toLocaleDateString()
}

interface ForumChannelViewProps {
  channel: ChannelItem
  server: ServerItem
  currentUserId: string
}

export function ForumChannelView({ channel, server, currentUserId }: ForumChannelViewProps) {
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [tags, setTags] = useState<ForumTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orden, setOrden] = useState<Orden>('actividad')
  const [tagFiltroId, setTagFiltroId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const { canView, canSendMessages } = useChannelPermissions(server, channel.id, currentUserId)
  const { isOwner, hasPermission } = useServerPermissions(server, currentUserId)
  const canManageForum = isOwner || hasPermission('gestionar_canales')

  function cargar() {
    return Promise.all([listarHilosDeForo(channel.id), listarEtiquetasDeForo(channel.id)])
      .then(([h, t]) => {
        setThreads(h)
        setTags(t)
        setError(null)
      })
      .catch((err) => setError(getErrorMessage(err)))
  }

  useEffect(() => {
    cargar().finally(() => setLoading(false))
    const unsubscribe = suscribirseAHilosDeForo(channel.id, () => {
      cargar().catch(() => {})
    })
    return unsubscribe
  }, [channel.id])

  const hilosFiltrados = useMemo(() => {
    const filtrados = tagFiltroId
      ? threads.filter((t) => t.tags.some((tag) => tag.id === tagFiltroId))
      : threads

    const ordenados = [...filtrados].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      const campoA = orden === 'actividad' ? a.lastActivityAt : a.createdAt
      const campoB = orden === 'actividad' ? b.lastActivityAt : b.createdAt
      return new Date(campoB).getTime() - new Date(campoA).getTime()
    })

    return ordenados
  }, [threads, tagFiltroId, orden])

  const activeThread = activeThreadId ? threads.find((t) => t.id === activeThreadId) : undefined

  if (activeThread) {
    return (
      <ForumThreadView
        thread={activeThread}
        server={server}
        currentUserId={currentUserId}
        canManage={canManageForum}
        onBack={() => setActiveThreadId(null)}
        onThreadChanged={() => cargar().catch(() => {})}
        onDeleted={() => {
          setActiveThreadId(null)
          cargar().catch(() => {})
        }}
      />
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <MessagesSquare className="size-4 shrink-0 text-muted-foreground" />
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {channel.name}
        </h1>
        {canSendMessages && (
          <Button type="button" size="sm" variant="outline" onClick={() => setTagsDialogOpen(true)}>
            <Tag className="size-3.5" />
            Etiquetas
          </Button>
        )}
        {canSendMessages && (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            Nueva publicación
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1 rounded-md bg-muted p-0.5 text-xs">
          {(
            [
              ['actividad', 'Actividad reciente'],
              ['nuevos', 'Más nuevos'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setOrden(id)}
              className={cn(
                'rounded px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                orden === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTagFiltroId(null)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                tagFiltroId === null
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              Todas
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setTagFiltroId((prev) => (prev === tag.id ? null : tag.id))}
                aria-pressed={tagFiltroId === tag.id}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  tagFiltroId === tag.id
                    ? 'border-transparent text-white'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
                style={tagFiltroId === tag.id ? { backgroundColor: tag.color } : undefined}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 p-4">
          {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && !canView && (
            <p className="text-sm text-muted-foreground">No tenés permiso para ver este foro.</p>
          )}
          {!loading && !error && canView && hilosFiltrados.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todavía no hay publicaciones. Sé el primero en crear una.
            </p>
          )}
          {!loading &&
            !error &&
            canView &&
            hilosFiltrados.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setActiveThreadId(thread.id)}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <div className="flex items-center gap-2">
                  {thread.pinned && <Pin className="size-3.5 shrink-0 text-primary" />}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {thread.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(thread.lastActivityAt)}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{thread.body}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {thread.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full px-2 py-0.5 text-[11px] text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar size="sm">
                    {thread.author.avatarUrl && <AvatarImage src={thread.author.avatarUrl} />}
                    <AvatarFallback>{thread.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{thread.author.name}</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-3.5" />
                    {thread.messageCount}
                  </span>
                </div>
              </button>
            ))}
        </div>
      </ScrollArea>

      <CrearHiloForoDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        canalForoId={channel.id}
        tags={tags}
        onCreated={(hiloId) => {
          cargar().then(() => setActiveThreadId(hiloId))
        }}
      />

      <ForumTagsDialog
        open={tagsDialogOpen}
        onOpenChange={setTagsDialogOpen}
        canalId={channel.id}
        onChanged={() => cargar().catch(() => {})}
      />
    </div>
  )
}

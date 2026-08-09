import { useEffect, useState } from 'react'
import { Lock, MessagesSquare, Pin } from 'lucide-react'

import { listarHilosDeCanal, suscribirseAHilosDeCanal, type ChannelThread } from '@/lib/threads'
import { formatTimestamp } from '@/lib/message-format'
import { getErrorMessage } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ThreadsListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: string
  onSelectThread: (thread: ChannelThread) => void
}

export function ThreadsListDialog({
  open,
  onOpenChange,
  channelId,
  onSelectThread,
}: ThreadsListDialogProps) {
  const [threads, setThreads] = useState<ChannelThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelado = false

    function cargar() {
      listarHilosDeCanal(channelId)
        .then((data) => !cancelado && setThreads(data))
        .catch((err) => !cancelado && setError(getErrorMessage(err)))
        .finally(() => !cancelado && setLoading(false))
    }

    cargar()
    const unsubscribe = suscribirseAHilosDeCanal(channelId, cargar)

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [open, channelId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Hilos</DialogTitle>
          <DialogDescription>Conversaciones abiertas dentro de este canal.</DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {!loading && threads.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay hilos en este canal.</p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelectThread(thread)}
                className="flex items-center gap-2.5 rounded-md px-2 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Avatar size="sm" className="shrink-0">
                  {thread.author.avatarUrl && <AvatarImage src={thread.author.avatarUrl} />}
                  <AvatarFallback>
                    <MessagesSquare className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                    {thread.nombre}
                    {thread.pinned && <Pin className="size-3 shrink-0 text-primary" />}
                    {thread.locked && <Lock className="size-3 shrink-0 text-destructive" />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {thread.messageCount} mensajes · {formatTimestamp(thread.lastActivityAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState } from 'react'
import { Pin, PinOff } from 'lucide-react'

import { listarMensajesFijados, desfijarMensaje } from '@/lib/messages'
import { getErrorMessage } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PinnedMessagesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: string
  canUnpin: boolean
  onJumpToMessage: (messageId: string) => void
}

function previewDeMensaje(message: ChatMessage): string {
  if (message.code) return 'Código'
  if (message.content) return message.content
  if (message.attachment) return 'Adjunto'
  return ''
}

export function PinnedMessagesDialog({
  open,
  onOpenChange,
  channelId,
  canUnpin,
  onJumpToMessage,
}: PinnedMessagesDialogProps) {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelado = false

    listarMensajesFijados(channelId)
      .then((data) => {
        if (cancelado) return
        setMessages(data)
        setError(null)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))

    return () => {
      cancelado = true
    }
  }, [open, channelId])

  async function handleUnpin(messageId: string) {
    const previous = messages
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    try {
      await desfijarMensaje(messageId)
    } catch (err) {
      setMessages(previous)
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mensajes fijados</DialogTitle>
          <DialogDescription>
            Mensajes importantes fijados en este canal.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex max-h-96 flex-col gap-1 overflow-y-auto">
          {loading && (
            <p className="px-1 py-4 text-center text-sm text-muted-foreground">Cargando…</p>
          )}
          {error && (
            <p className="px-1 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && messages.length === 0 && (
            <p className="px-1 py-4 text-center text-sm text-muted-foreground">
              Todavía no hay mensajes fijados en este canal.
            </p>
          )}
          {!loading &&
            !error &&
            messages.map((message) => (
              <div
                key={message.id}
                className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-muted/50"
              >
                <Avatar size="sm" className="mt-0.5 shrink-0">
                  {message.author.avatarUrl && <AvatarImage src={message.author.avatarUrl} />}
                  <AvatarFallback>{message.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {message.author.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {message.timestamp}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {previewDeMensaje(message)}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onJumpToMessage(message.id)}
                      className="flex items-center gap-1 text-xs font-medium text-primary outline-none hover:underline"
                    >
                      <Pin className="size-3" />
                      Ir al mensaje
                    </button>
                    {canUnpin && (
                      <button
                        type="button"
                        onClick={() => handleUnpin(message.id)}
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground outline-none hover:text-destructive hover:underline"
                      >
                        <PinOff className="size-3" />
                        Desfijar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState } from 'react'
import { ArrowLeft, Lock, Pin, Trash2 } from 'lucide-react'

import {
  editarMensaje,
  eliminarMensaje,
  enviarMensaje,
  listarMensajes,
  suscribirseACanal,
} from '@/lib/messages'
import { bloquearHiloDeCanal, eliminarHiloDeCanal, fijarHiloDeCanal, type ChannelThread } from '@/lib/threads'
import { cn, getErrorMessage } from '@/lib/utils'
import type {
  ChannelItem,
  ChatAttachment,
  ChatMessage,
  CodeBlock,
  ReplyPreview,
  ServerItem,
} from '@/lib/types'
import { ChatPrincipal } from '@/components/ChatPrincipal'
import { ForwardMessageDialog } from '@/components/ForwardMessageDialog'

interface ChannelThreadViewProps {
  thread: ChannelThread
  server: ServerItem
  currentUserId: string
  canManage: boolean
  onBack: () => void
  onThreadChanged: () => void
  onDeleted: () => void
}

export function ChannelThreadView({
  thread,
  server,
  currentUserId,
  canManage,
  onBack,
  onThreadChanged,
  onDeleted,
}: ChannelThreadViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [replyingTo, setReplyingTo] = useState<ReplyPreview | null>(null)
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null)
  const [forwardMessage, setForwardMessage] = useState<{
    message: ChatMessage
    sourceLabel: string
  } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canDelete = canManage || thread.author.id === currentUserId

  useEffect(() => {
    let cancelado = false
    listarMensajes(thread.id)
      .then((data) => {
        if (!cancelado) setMessages(data)
      })
      .catch((err) => console.error('No se pudieron cargar los mensajes', err))

    const unsubscribe = suscribirseACanal(thread.id, {
      onNuevoMensaje: (mensaje) => {
        setMessages((prev) => (prev.some((m) => m.id === mensaje.id) ? prev : [...prev, mensaje]))
      },
      onMensajeEditado: (mensaje) => {
        setMessages((prev) => prev.map((m) => (m.id === mensaje.id ? mensaje : m)))
      },
      onMensajeEliminado: (mensajeId) => {
        setMessages((prev) => prev.filter((m) => m.id !== mensajeId))
      },
    })

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [thread.id])

  async function handleSendMessage(message: {
    content?: string
    code?: CodeBlock
    attachment?: ChatAttachment
    respuestaAId?: string
  }) {
    if (thread.locked && !canManage) {
      setSendError('Este hilo está bloqueado. Solo quienes gestionan canales pueden responder.')
      return
    }
    setSendError(null)
    try {
      const nuevo = await enviarMensaje(thread.id, currentUserId, message)
      setMessages((prev) => (prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo]))
      setReplyingTo(null)
      onThreadChanged()
      return nuevo
    } catch (err) {
      console.error('No se pudo enviar el mensaje', err)
    }
  }

  async function handleEditMessage(messageId: string, content: string) {
    try {
      const editado = await editarMensaje(messageId, content)
      setMessages((prev) => prev.map((m) => (m.id === editado.id ? editado : m)))
    } catch (err) {
      console.error('No se pudo editar el mensaje', err)
    }
  }

  async function handleDeleteMessage(messageId: string) {
    try {
      await eliminarMensaje(messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err) {
      console.error('No se pudo borrar el mensaje', err)
    }
  }

  function handleReplyMessage(message: ChatMessage) {
    setReplyingTo({
      id: message.id,
      authorName: message.author.name,
      preview: message.content ?? (message.code ? 'Código' : 'Adjunto'),
    })
  }

  async function handleTogglePin() {
    setActionError(null)
    try {
      await fijarHiloDeCanal(thread.id, !thread.pinned)
      onThreadChanged()
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  async function handleToggleLock() {
    setActionError(null)
    try {
      await bloquearHiloDeCanal(thread.id, !thread.locked)
      onThreadChanged()
    } catch (err) {
      setActionError(getErrorMessage(err))
    }
  }

  async function handleEliminar() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setActionError(null)
    setDeleting(true)
    try {
      await eliminarHiloDeCanal(server.id, thread.id)
      onDeleted()
    } catch (err) {
      setActionError(getErrorMessage(err))
      setDeleting(false)
    }
  }

  const channel: ChannelItem = { id: thread.id, name: thread.nombre, type: 'text' }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" />
          Volver
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {thread.nombre}
        </span>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={handleTogglePin}
              aria-pressed={thread.pinned}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50',
                thread.pinned ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Pin className="size-3.5" />
              {thread.pinned ? 'Fijado' : 'Fijar'}
            </button>
            <button
              type="button"
              onClick={handleToggleLock}
              aria-pressed={thread.locked}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50',
                thread.locked ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              <Lock className="size-3.5" />
              {thread.locked ? 'Bloqueado' : 'Bloquear'}
            </button>
          </div>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={handleEliminar}
            disabled={deleting}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50',
              confirmingDelete ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            <Trash2 className="size-3.5" />
            {deleting ? 'Eliminando…' : confirmingDelete ? '¿Seguro? Click de nuevo' : 'Eliminar'}
          </button>
        )}
      </div>

      {actionError && (
        <p className="border-b border-border px-3 py-1.5 text-xs text-destructive" role="alert">
          {actionError}
        </p>
      )}
      {sendError && (
        <p className="border-b border-border px-3 py-1.5 text-xs text-destructive" role="alert">
          {sendError}
        </p>
      )}

      <ChatPrincipal
        channel={channel}
        messages={messages}
        onSendMessage={handleSendMessage}
        server={server}
        currentUserId={currentUserId}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReplyMessage={handleReplyMessage}
        onForwardMessage={(message) =>
          setForwardMessage({ message, sourceLabel: `${thread.nombre} en ${server.name}` })
        }
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        highlightMessageId={highlightMessageId}
        onJumpToChannelMessage={(_channelId, messageId) => setHighlightMessageId(messageId)}
        disableThreads
      />

      {forwardMessage && (
        <ForwardMessageDialog
          open={Boolean(forwardMessage)}
          onOpenChange={(open) => !open && setForwardMessage(null)}
          message={forwardMessage.message}
          sourceLabel={forwardMessage.sourceLabel}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}

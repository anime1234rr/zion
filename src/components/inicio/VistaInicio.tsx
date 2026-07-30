import { useCallback, useEffect, useState } from 'react'
import { MessageCircleHeart } from 'lucide-react'

import {
  editarMensajeDirecto,
  eliminarMensajeDirecto,
  enviarMensajeDirecto,
  listarMensajesDirectos,
  marcarConversacionLeida,
  obtenerConversacion,
  obtenerOCrearConversacion,
  suscribirseAConversacion,
} from '@/lib/dms'
import { obtenerPerfil } from '@/lib/profiles'
import type { ChatAttachment, ChatMessage, ChatUser, CodeBlock, ReplyPreview } from '@/lib/types'
import { FriendsSidebar } from '@/components/inicio/FriendsSidebar'
import { DMChatPrincipal } from '@/components/inicio/DMChatPrincipal'
import { ForwardMessageDialog } from '@/components/ForwardMessageDialog'

interface VistaInicioProps {
  currentUserId: string
  profile: ChatUser | null
  onSignOut?: () => void
  onProfileUpdated?: (user: ChatUser) => void
  pendingUserId?: string | null
  onPendingUserHandled?: () => void
  pendingConversation?: { conversationId: string; messageId?: string } | null
  onPendingConversationHandled?: () => void
}

export function VistaInicio({
  currentUserId,
  profile,
  onSignOut,
  onProfileUpdated,
  pendingUserId,
  onPendingUserHandled,
  pendingConversation,
  onPendingConversationHandled,
}: VistaInicioProps) {
  const [activeConversation, setActiveConversation] = useState<{
    id: string
    otherUser: ChatUser
  } | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [replyingTo, setReplyingTo] = useState<ReplyPreview | null>(null)
  const [forwardMessage, setForwardMessage] = useState<{
    message: ChatMessage
    sourceLabel: string
  } | null>(null)
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null)

  useEffect(() => {
    if (!activeConversation) return
    let cancelado = false

    listarMensajesDirectos(activeConversation.id)
      .then((data) => {
        if (!cancelado) setMessages(data)
      })
      .catch((err) => console.error('No se pudieron cargar los mensajes directos', err))

    marcarConversacionLeida(activeConversation.id).catch(() => {})

    const unsubscribe = suscribirseAConversacion(activeConversation.id, {
      onNuevoMensaje: (mensaje) => {
        setMessages((prev) => (prev.some((m) => m.id === mensaje.id) ? prev : [...prev, mensaje]))
        marcarConversacionLeida(activeConversation.id).catch(() => {})
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
  }, [activeConversation])

  const handleSelectConversation = useCallback((conversationId: string, otherUser: ChatUser) => {
    setMessages([])
    setReplyingTo(null)
    setActiveConversation({ id: conversationId, otherUser })
  }, [])

  const handleMessageUser = useCallback((userId: string) => {
    return Promise.all([obtenerOCrearConversacion(userId), obtenerPerfil(userId)])
      .then(([conversationId, otherUser]) => {
        setMessages([])
        setReplyingTo(null)
        setActiveConversation({ id: conversationId, otherUser })
      })
      .catch((err) => console.error('No se pudo abrir la conversación', err))
  }, [])

  useEffect(() => {
    if (!pendingUserId) return
    handleMessageUser(pendingUserId).finally(() => onPendingUserHandled?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUserId])

  useEffect(() => {
    if (!pendingConversation) return
    let cancelado = false

    obtenerConversacion(pendingConversation.conversationId, currentUserId)
      .then((conversation) => {
        if (cancelado || !conversation) return
        setMessages([])
        setReplyingTo(null)
        setActiveConversation({ id: conversation.id, otherUser: conversation.otherUser })
        setHighlightMessageId(pendingConversation.messageId ?? null)
      })
      .catch((err) => console.error('No se pudo abrir la conversación', err))
      .finally(() => !cancelado && onPendingConversationHandled?.())

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingConversation])

  useEffect(() => {
    if (!highlightMessageId) return
    const timeout = setTimeout(() => setHighlightMessageId(null), 2500)
    return () => clearTimeout(timeout)
  }, [highlightMessageId])

  const handleSendMessage = useCallback(
    async (message: { content?: string; code?: CodeBlock; attachment?: ChatAttachment }) => {
      if (!activeConversation) return
      try {
        const nuevo = await enviarMensajeDirecto(activeConversation.id, {
          ...message,
          respuestaAId: replyingTo?.id,
        })
        setMessages((prev) => (prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo]))
        setReplyingTo(null)
      } catch (err) {
        console.error('No se pudo enviar el mensaje', err)
      }
    },
    [activeConversation, replyingTo]
  )

  const handleEditMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const editado = await editarMensajeDirecto(messageId, content)
      setMessages((prev) => prev.map((m) => (m.id === editado.id ? editado : m)))
    } catch (err) {
      console.error('No se pudo editar el mensaje', err)
    }
  }, [])

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await eliminarMensajeDirecto(messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err) {
      console.error('No se pudo borrar el mensaje', err)
    }
  }, [])

  const handleReplyMessage = useCallback((message: ChatMessage) => {
    setReplyingTo({
      id: message.id,
      authorName: message.author.name,
      preview: message.content ?? (message.code ? 'Código' : 'Adjunto'),
    })
  }, [])

  return (
    <div className="flex h-full flex-1">
      <FriendsSidebar
        currentUserId={currentUserId}
        profile={profile}
        onSignOut={onSignOut}
        onProfileUpdated={onProfileUpdated}
        activeConversationId={activeConversation?.id ?? null}
        onSelectConversation={handleSelectConversation}
        onMessageUser={handleMessageUser}
      />

      {activeConversation ? (
        <DMChatPrincipal
          conversationId={activeConversation.id}
          otherUser={activeConversation.otherUser}
          currentUserId={currentUserId}
          messages={messages}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onReplyMessage={handleReplyMessage}
          onForwardMessage={(message) =>
            setForwardMessage({
              message,
              sourceLabel: `Mensaje directo con ${activeConversation.otherUser.name}`,
            })
          }
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          highlightMessageId={highlightMessageId}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-background text-center">
          <MessageCircleHeart className="size-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Elegí una conversación o agregá amigos para empezar a chatear.
          </p>
        </div>
      )}

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

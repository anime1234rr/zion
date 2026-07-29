import { useEffect, useState } from 'react'
import { Hash, MessageSquare } from 'lucide-react'

import { listarCanales } from '@/lib/channels'
import { enviarMensajeDirecto, listarConversaciones } from '@/lib/dms'
import { enviarMensaje } from '@/lib/messages'
import { listarServidores } from '@/lib/servers'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChannelCategory, ChatMessage, DMConversation, ServerItem } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ForwardMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: ChatMessage
  sourceLabel: string
  currentUserId: string
}

type Tab = 'canales' | 'dms'

export function ForwardMessageDialog({
  open,
  onOpenChange,
  message,
  sourceLabel,
  currentUserId,
}: ForwardMessageDialogProps) {
  const [tab, setTab] = useState<Tab>('canales')
  const [servers, setServers] = useState<ServerItem[]>([])
  const [channelsByServer, setChannelsByServer] = useState<Record<string, ChannelCategory[]>>({})
  const [conversations, setConversations] = useState<DMConversation[]>([])
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    Promise.all([listarServidores(), listarConversaciones(currentUserId)])
      .then(([s, c]) => {
        setServers(s)
        setConversations(c)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [open, currentUserId])

  async function ensureChannelsLoaded(serverId: string) {
    if (channelsByServer[serverId]) return
    try {
      const categories = await listarCanales(serverId)
      setChannelsByServer((prev) => ({ ...prev, [serverId]: categories }))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleForwardToChannel(channelId: string) {
    setSendingTo(channelId)
    setError(null)
    try {
      await enviarMensaje(channelId, currentUserId, {
        content: message.content,
        code: message.code,
        attachment: message.attachment,
        reenviadoDe: {
          autorId: message.author.id,
          autorNombre: message.author.name,
          origen: sourceLabel,
        },
      })
      setSentTo((prev) => new Set(prev).add(channelId))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSendingTo(null)
    }
  }

  async function handleForwardToConversation(conversationId: string) {
    setSendingTo(conversationId)
    setError(null)
    try {
      await enviarMensajeDirecto(conversationId, {
        content: message.content,
        code: message.code,
        attachment: message.attachment,
        reenviadoDe: {
          autorId: message.author.id,
          autorNombre: message.author.name,
          origen: sourceLabel,
        },
      })
      setSentTo((prev) => new Set(prev).add(conversationId))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSendingTo(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reenviar mensaje</DialogTitle>
          <DialogDescription>Elegí a dónde reenviar este mensaje de {message.author.name}.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border-b border-border">
          {(
            [
              ['canales', 'Canales'],
              ['dms', 'Mensajes directos'],
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

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="max-h-80 overflow-y-auto">
          {loading && <p className="px-1 py-2 text-sm text-muted-foreground">Cargando…</p>}

          {!loading && tab === 'canales' && (
            <div className="flex flex-col gap-1">
              {servers.length === 0 && (
                <p className="px-1 py-2 text-sm text-muted-foreground">No sos miembro de ningún servidor.</p>
              )}
              {servers.map((server) => (
                <div key={server.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedServerId((prev) => (prev === server.id ? null : server.id))
                      ensureChannelsLoaded(server.id)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm font-medium text-foreground outline-none hover:bg-muted/50"
                  >
                    {server.name}
                  </button>
                  {expandedServerId === server.id && (
                    <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
                      {(channelsByServer[server.id] ?? [])
                        .flatMap((category) => category.channels)
                        .map((channel) => (
                          <button
                            key={channel.id}
                            type="button"
                            disabled={sendingTo === channel.id || sentTo.has(channel.id)}
                            onClick={() => handleForwardToChannel(channel.id)}
                            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm text-muted-foreground outline-none hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
                          >
                            <Hash className="size-3.5 shrink-0" />
                            {channel.name}
                            {sentTo.has(channel.id) && (
                              <span className="ml-auto text-xs text-primary">Enviado</span>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && tab === 'dms' && (
            <div className="flex flex-col gap-0.5">
              {conversations.length === 0 && (
                <p className="px-1 py-2 text-sm text-muted-foreground">No tenés conversaciones directas.</p>
              )}
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  disabled={sendingTo === conversation.id || sentTo.has(conversation.id)}
                  onClick={() => handleForwardToConversation(conversation.id)}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm text-foreground outline-none hover:bg-muted/50 disabled:opacity-50"
                >
                  <Avatar size="sm">
                    {conversation.otherUser.avatarUrl && (
                      <AvatarImage src={conversation.otherUser.avatarUrl} />
                    )}
                    <AvatarFallback>
                      {conversation.otherUser.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">{conversation.otherUser.name}</span>
                  {sentTo.has(conversation.id) ? (
                    <span className="text-xs text-primary">Enviado</span>
                  ) : (
                    <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

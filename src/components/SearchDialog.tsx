import { useEffect, useMemo, useRef, useState } from 'react'
import { FileImage, FileVideo, Hash, MessageSquare, Music, Search, X } from 'lucide-react'

import { buscarMensajes, buscarUsuariosEnServidor, type MessageSearchResult, type SearchScope } from '@/lib/search'
import { cn, getErrorMessage } from '@/lib/utils'
import { formatTimestamp } from '@/lib/message-format'
import type { ChannelItem, ChatAttachment, ChatUser, ServerItem } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: ServerItem
  channel: ChannelItem
  currentUserId: string
  onJumpToMessage: (channelId: string, messageId: string) => void
  onMessageUser?: (userId: string) => void
}

const TIENE_RE = /\btiene:(imagen|imágen|foto|video|audio)\b/i
const DE_RE = /\bde:@?(\S+)/i

const tieneLabelToType: Record<string, ChatAttachment['type']> = {
  imagen: 'image',
  imágen: 'image',
  foto: 'image',
  video: 'video',
  audio: 'audio',
}

const attachmentBadge: Record<ChatAttachment['type'], { label: string; icon: typeof FileImage }> = {
  image: { label: 'Imagen', icon: FileImage },
  video: { label: 'Video', icon: FileVideo },
  audio: { label: 'Audio', icon: Music },
}

function parseQuery(raw: string): { freeText: string; deToken: string } {
  let text = raw

  let deToken = ''
  const deMatch = text.match(DE_RE)
  if (deMatch) {
    deToken = deMatch[1]
    text = text.slice(0, deMatch.index) + text.slice(deMatch.index! + deMatch[0].length)
  }

  return { freeText: text.replace(/\s+/g, ' ').trim(), deToken }
}

function previewMensaje(result: MessageSearchResult): string {
  if (result.esCodigo) return 'Código'
  const oneLine = result.contenido.replace(/\s+/g, ' ').trim()
  if (oneLine) return oneLine.length > 140 ? `${oneLine.slice(0, 140)}…` : oneLine
  if (result.attachment) return attachmentBadge[result.attachment.type].label
  return ''
}

export function SearchDialog({
  open,
  onOpenChange,
  server,
  channel,
  currentUserId,
  onJumpToMessage,
  onMessageUser,
}: SearchDialogProps) {
  const [rawQuery, setRawQuery] = useState('')
  const [scope, setScope] = useState<SearchScope>('channel')
  const [authorFilter, setAuthorFilter] = useState<ChatUser | null>(null)
  const [adjuntoFilter, setAdjuntoFilter] = useState<ChatAttachment['type'] | null>(null)
  const [authorSuggestions, setAuthorSuggestions] = useState<ChatUser[]>([])
  const [userResults, setUserResults] = useState<ChatUser[]>([])
  const [messageResults, setMessageResults] = useState<MessageSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => parseQuery(rawQuery), [rawQuery])
  const hasCriteria = Boolean(parsed.freeText || authorFilter || adjuntoFilter)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleQueryChange(value: string) {
    const tieneMatch = value.match(TIENE_RE)
    if (tieneMatch) {
      const type = tieneLabelToType[tieneMatch[1].toLowerCase()]
      if (type) setAdjuntoFilter(type)
      value = (value.slice(0, tieneMatch.index) + value.slice(tieneMatch.index! + tieneMatch[0].length))
        .replace(/\s+/g, ' ')
    }
    setRawQuery(value)
  }

  useEffect(() => {
    if (!parsed.deToken || authorFilter) return
    let cancelado = false
    const timeout = setTimeout(() => {
      buscarUsuariosEnServidor(server.id, parsed.deToken)
        .then((results) => !cancelado && setAuthorSuggestions(results))
        .catch(() => !cancelado && setAuthorSuggestions([]))
    }, 200)
    return () => {
      cancelado = true
      clearTimeout(timeout)
    }
  }, [parsed.deToken, authorFilter, server.id])

  function pickAuthorSuggestion(user: ChatUser) {
    setAuthorFilter(user)
    setAuthorSuggestions([])
    setRawQuery((prev) => prev.replace(DE_RE, ' ').replace(/\s+/g, ' ').trim())
    inputRef.current?.focus()
  }

  useEffect(() => {
    const freeText = parsed.freeText
    if (!open || (!freeText && !authorFilter && !adjuntoFilter)) return

    let cancelado = false
    const timeout = setTimeout(() => {
      if (cancelado) return
      setLoading(true)
      setError(null)
      const tasks: Promise<void>[] = [
        buscarMensajes(
          server.id,
          { type: scope, canalId: channel.id },
          { query: freeText, autorId: authorFilter?.id ?? null, adjuntoTipo: adjuntoFilter }
        )
          .then((results) => !cancelado && setMessageResults(results))
          .catch((err) => !cancelado && setError(getErrorMessage(err))),
      ]

      if (freeText) {
        tasks.push(
          buscarUsuariosEnServidor(server.id, freeText)
            .then((results) => !cancelado && setUserResults(results))
            .catch(() => !cancelado && setUserResults([]))
        )
      }

      Promise.all(tasks).finally(() => !cancelado && setLoading(false))
    }, 250)

    return () => {
      cancelado = true
      clearTimeout(timeout)
    }
  }, [parsed.freeText, authorFilter, adjuntoFilter, scope, server.id, channel.id, open])

  function handleJumpToResult(result: MessageSearchResult) {
    onJumpToMessage(result.canalId, result.id)
    onOpenChange(false)
  }

  const visibleMessageResults = hasCriteria ? messageResults : []
  const visibleUserResults = hasCriteria && parsed.freeText ? userResults : []
  const visibleAuthorSuggestions = parsed.deToken && !authorFilter ? authorSuggestions : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-3 p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Buscar en {server.name}</DialogTitle>

        <div className="flex flex-col gap-2 border-b border-border p-3">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-2.5 py-2 focus-within:ring-3 focus-within:ring-ring/50">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={rawQuery}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Buscar mensajes o usuarios… probá de:usuario o tiene:imagen"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar búsqueda"
              className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {visibleAuthorSuggestions.length > 0 && (
            <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-popover p-1">
              {visibleAuthorSuggestions.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => pickAuthorSuggestion(user)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
                >
                  <Avatar size="sm">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                    <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-foreground">{user.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">Filtrar por autor</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-full border border-border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setScope('channel')}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
                  scope === 'channel' && 'bg-muted text-foreground'
                )}
              >
                <Hash className="size-3" />#{channel.name}
              </button>
              <button
                type="button"
                onClick={() => setScope('server')}
                className={cn(
                  'rounded-full px-2.5 py-1 font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
                  scope === 'server' && 'bg-muted text-foreground'
                )}
              >
                Todo {server.name}
              </button>
            </div>

            {authorFilter && (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pr-1 pl-2 text-xs font-medium text-primary">
                de: {authorFilter.name}
                <button
                  type="button"
                  onClick={() => setAuthorFilter(null)}
                  aria-label="Quitar filtro de autor"
                  className="flex size-4 items-center justify-center rounded-full outline-none hover:bg-primary/20"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {adjuntoFilter && (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pr-1 pl-2 text-xs font-medium text-primary">
                {attachmentBadge[adjuntoFilter].label}
                <button
                  type="button"
                  onClick={() => setAdjuntoFilter(null)}
                  aria-label="Quitar filtro de adjunto"
                  className="flex size-4 items-center justify-center rounded-full outline-none hover:bg-primary/20"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto px-3 pb-3">
          {!hasCriteria && (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              Escribí para buscar. Usá <span className="font-mono">de:usuario</span> para filtrar por autor y{' '}
              <span className="font-mono">tiene:imagen</span>, <span className="font-mono">tiene:video</span> o{' '}
              <span className="font-mono">tiene:audio</span> para filtrar por adjunto.
            </p>
          )}

          {error && (
            <p className="px-1 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {hasCriteria && loading && visibleMessageResults.length === 0 && visibleUserResults.length === 0 && (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">Buscando…</p>
          )}

          {visibleUserResults.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="px-1 text-xs font-medium text-muted-foreground uppercase">Usuarios</p>
              {visibleUserResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-muted/50"
                >
                  <button
                    type="button"
                    onClick={() => pickAuthorSuggestion(user)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none"
                  >
                    <Avatar size="sm">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                      <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{user.name}</span>
                  </button>
                  {onMessageUser && user.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => {
                        onMessageUser(user.id)
                        onOpenChange(false)
                      }}
                      aria-label={`Enviar mensaje a ${user.name}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <MessageSquare className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {visibleMessageResults.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="px-1 text-xs font-medium text-muted-foreground uppercase">Mensajes</p>
              {visibleMessageResults.map((result) => {
                const AttachmentIcon = result.attachment ? attachmentBadge[result.attachment.type].icon : null
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleJumpToResult(result)}
                    className="flex items-start gap-2.5 rounded-lg p-1.5 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
                  >
                    <Avatar size="sm" className="mt-0.5 shrink-0">
                      {result.author.avatarUrl && <AvatarImage src={result.author.avatarUrl} />}
                      <AvatarFallback>{result.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">{result.author.name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          #{result.canalNombre}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatTimestamp(result.creadoAt)}
                        </span>
                      </div>
                      <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                        {AttachmentIcon && <AttachmentIcon className="size-3.5 shrink-0" />}
                        {previewMensaje(result)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {hasCriteria && !loading && visibleMessageResults.length === 0 && visibleUserResults.length === 0 && !error && (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              No se encontraron resultados.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

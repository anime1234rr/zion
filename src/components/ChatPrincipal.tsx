import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Code2,
  Copy,
  Hash,
  ImageUp,
  Maximize2,
  Megaphone,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pin,
  Search,
  Send,
  Smile,
  SmilePlus,
  Square,
  Users,
  Volume2,
  X,
} from 'lucide-react'

import { buildChannelMessageLink } from '@/lib/deep-links'
import { cn, getErrorMessage } from '@/lib/utils'
import { formatFencedCode, parseFencedCode } from '@/lib/code-fence'
import { groupMessages } from '@/lib/message-grouping'
import { CHAT_ADJUNTO_ACCEPT, subirArchivoChat, subirNotaDeVoz } from '@/lib/storage'
import { alternarReaccionMensaje, desfijarMensaje, fijarMensaje } from '@/lib/messages'
import { useMessageActions } from '@/hooks/use-message-actions'
import { useServerPermissions } from '@/hooks/use-server-permissions'
import { useVoiceMessageRecorder } from '@/hooks/use-voice-message-recorder'
import type {
  ChannelItem,
  ChannelType,
  ChatAttachment,
  ChatMessage,
  CodeBlock as CodeBlockData,
  ReplyPreview,
  ServerItem,
} from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NotificationsDropdown } from '@/components/NotificationsDropdown'
import { UserProfileCard } from '@/components/UserProfileCard'
import { PinnedMessagesDialog } from '@/components/PinnedMessagesDialog'
import { MediaViewerDialog } from '@/components/MediaViewerDialog'
import { EmojiPicker } from '@/components/EmojiPicker'
import { MessageReactions } from '@/components/MessageReactions'
import { VoiceMessageRecorder } from '@/components/VoiceMessageRecorder'
import { VoiceMessagePlayer } from '@/components/VoiceMessagePlayer'

const channelIcon: Record<ChannelType, typeof Hash> = {
  text: Hash,
  voice: Volume2,
  code: Code2,
  announcement: Megaphone,
}

function messageToRawText(message: Pick<ChatMessage, 'content' | 'code'>): string {
  if (message.code) return formatFencedCode(message.code)
  return message.content ?? ''
}

function CodeBlock({ language, code }: CodeBlockData) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-1 max-w-xl overflow-hidden rounded-lg border border-border bg-code">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-1">
        <span className="text-xs text-muted-foreground">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  )
}

interface MessageRowProps {
  message: ChatMessage
  currentUserId: string
  canDeleteOthers: boolean
  canPinMessages: boolean
  serverId: string
  channelId: string
  onEditMessage: (messageId: string, content: string) => void
  onDeleteMessage: (messageId: string) => void
  onReplyMessage: (message: ChatMessage) => void
  onForwardMessage: (message: ChatMessage) => void
  onPinMessage: (messageId: string) => void
  onUnpinMessage: (messageId: string) => void
  highlighted: boolean
}

function MessageRow({
  message,
  currentUserId,
  canDeleteOthers,
  canPinMessages,
  serverId,
  channelId,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
  onForwardMessage,
  onPinMessage,
  onUnpinMessage,
  highlighted,
}: MessageRowProps) {
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(messageToRawText(message))
  const [viewerOpen, setViewerOpen] = useState(false)
  const isOwnMessage = message.author.id === currentUserId

  const actions = useMessageActions({
    isOwnMessage,
    canDeleteOthers,
    onEdit: () => {
      setEditDraft(messageToRawText(message))
      setEditing(true)
    },
    onDelete: () => onDeleteMessage(message.id),
    onReply: () => onReplyMessage(message),
    onForward: () => onForwardMessage(message),
    onCopyId: () => navigator.clipboard.writeText(message.id),
    onCopyLink: () =>
      navigator.clipboard.writeText(buildChannelMessageLink(serverId, channelId, message.id)),
    onCopyContent: () => navigator.clipboard.writeText(messageToRawText(message)),
    isPinned: message.pinned,
    canPin: canPinMessages,
    onPin: () => onPinMessage(message.id),
    onUnpin: () => onUnpinMessage(message.id),
  })

  function saveEdit() {
    if (!editDraft.trim() && !message.attachment) return
    onEditMessage(message.id, editDraft)
    setEditing(false)
  }

  async function handleToggleReaction(emoji: string) {
    try {
      await alternarReaccionMensaje(message.id, emoji)
    } catch (err) {
      console.error('No se pudo reaccionar al mensaje', err)
    }
  }

  return (
    <>
      <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          id={`message-${message.id}`}
          className={cn(
            'group/message relative rounded-md px-1 py-0.5 transition-colors',
            highlighted && 'bg-primary/10'
          )}
        >
          {message.pinned && (
            <p className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Pin className="size-3" />
              Mensaje fijado
            </p>
          )}
          {message.replyTo && (
            <p className="mb-0.5 truncate text-xs text-muted-foreground">
              ↪ Respondiendo a <span className="font-medium">{message.replyTo.authorName}</span>:{' '}
              {message.replyTo.preview}
            </p>
          )}
          {message.forwardedFrom && (
            <p className="mb-0.5 text-xs text-muted-foreground italic">
              Reenviado de {message.forwardedFrom.authorName}
              {message.forwardedFrom.origin ? ` — ${message.forwardedFrom.origin}` : ''}
            </p>
          )}

          {editing ? (
            <div className="flex flex-col gap-1.5">
              {message.attachment && message.attachment.type === 'audio' ? (
                <VoiceMessagePlayer url={message.attachment.url} />
              ) : (
                message.attachment && (
                  <div className="w-fit max-w-full overflow-hidden rounded-lg border border-border sm:max-w-sm">
                    {message.attachment.type === 'image' ? (
                      <img
                        src={message.attachment.url}
                        alt=""
                        className="max-h-80 max-w-full"
                      />
                    ) : (
                      <video
                        src={message.attachment.url}
                        controls
                        className="max-h-80 max-w-full"
                      />
                    )}
                  </div>
                )
              )}
              <Textarea
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    saveEdit()
                  }
                  if (event.key === 'Escape') setEditing(false)
                }}
                autoFocus
                rows={1}
                placeholder={message.attachment ? 'Agregar un texto (opcional)…' : undefined}
                className="min-h-8 resize-none text-sm"
              />
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="font-medium text-primary outline-none hover:underline"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-muted-foreground outline-none hover:underline"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.content && (
                <p className="text-sm break-words whitespace-pre-wrap text-foreground/90">
                  {message.content}
                  {message.editedAt && (
                    <span className="ml-1 text-[10px] text-muted-foreground">(editado)</span>
                  )}
                </p>
              )}
              {message.code && (
                <CodeBlock language={message.code.language} code={message.code.code} />
              )}
              {message.attachment && message.attachment.type === 'audio' && (
                <VoiceMessagePlayer url={message.attachment.url} className="mt-1" />
              )}
              {message.attachment && message.attachment.type !== 'audio' && (
                <div className="group/attachment relative mt-1 w-fit max-w-full">
                  <div className="max-h-80 w-fit max-w-full overflow-hidden rounded-lg border border-border sm:max-w-sm">
                    {message.attachment.type === 'image' ? (
                      <img
                        src={message.attachment.url}
                        alt=""
                        onClick={() => setViewerOpen(true)}
                        className="max-h-80 max-w-full cursor-pointer"
                      />
                    ) : (
                      <video
                        src={message.attachment.url}
                        controls
                        className="max-h-80 max-w-full"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    aria-label="Ampliar"
                    className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-md bg-black/60 text-white opacity-0 outline-none transition-opacity hover:bg-black/80 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 group-hover/attachment:opacity-100"
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                </div>
              )}
              <MessageReactions
                reactions={message.reactions}
                currentUserId={currentUserId}
                onToggle={handleToggleReaction}
              />
            </>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Agregar reacción"
                className="absolute top-1/2 right-9 flex size-7 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-background text-muted-foreground opacity-0 outline-none group-hover/message:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <SmilePlus className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-auto p-0">
              <EmojiPicker onSelect={handleToggleReaction} />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Más acciones"
                className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-background text-muted-foreground opacity-0 outline-none group-hover/message:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  variant={action.destructive ? 'destructive' : 'default'}
                  onSelect={action.onSelect}
                >
                  <action.icon className="size-4" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {actions.map((action) => (
          <ContextMenuItem
            key={action.key}
            variant={action.destructive ? 'destructive' : 'default'}
            onSelect={action.onSelect}
          >
            <action.icon className="size-4" />
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
      </ContextMenu>

      {viewerOpen && (
        <MediaViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          attachment={message.attachment ?? null}
          onForward={() => onForwardMessage(message)}
        />
      )}
    </>
  )
}

interface ChatPrincipalProps {
  channel: ChannelItem
  messages: ChatMessage[]
  onSendMessage: (message: {
    content?: string
    code?: CodeBlockData
    attachment?: ChatAttachment
    respuestaAId?: string
  }) => void
  server: ServerItem
  currentUserId: string
  membersOpen?: boolean
  onToggleMembers?: () => void
  onMessageUser?: (userId: string) => void
  onEditMessage: (messageId: string, content: string) => void
  onDeleteMessage: (messageId: string) => void
  onReplyMessage: (message: ChatMessage) => void
  onForwardMessage: (message: ChatMessage) => void
  replyingTo: ReplyPreview | null
  onCancelReply: () => void
  highlightMessageId?: string | null
  onNavigateToServer?: (serverId: string) => void
}

export function ChatPrincipal({
  channel,
  messages,
  onSendMessage,
  server,
  currentUserId,
  membersOpen = false,
  onToggleMembers,
  onMessageUser,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
  onForwardMessage,
  replyingTo,
  onCancelReply,
  highlightMessageId,
  onNavigateToServer,
}: ChatPrincipalProps) {
  const [draft, setDraft] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingVoiceBlob, setPendingVoiceBlob] = useState<Blob | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [pinnedDialogOpen, setPinnedDialogOpen] = useState(false)
  const [localHighlightId, setLocalHighlightId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollBottomRef = useRef<HTMLDivElement>(null)
  const dragCounterRef = useRef(0)
  const HeaderIcon = channelIcon[channel.type]
  const groups = groupMessages(messages)
  const { isOwner, hasPermission } = useServerPermissions(server, currentUserId)
  const canDeleteOthers = isOwner || hasPermission('borrar_mensajes_ajenos')
  const canPinMessages = isOwner || hasPermission('fijar_mensajes')

  const pendingPreviewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  )

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
  }, [pendingPreviewUrl])

  const pendingVoicePreviewUrl = useMemo(
    () => (pendingVoiceBlob ? URL.createObjectURL(pendingVoiceBlob) : null),
    [pendingVoiceBlob]
  )

  useEffect(() => {
    return () => {
      if (pendingVoicePreviewUrl) URL.revokeObjectURL(pendingVoicePreviewUrl)
    }
  }, [pendingVoicePreviewUrl])

  const voiceRecorder = useVoiceMessageRecorder((blob) => setPendingVoiceBlob(blob))

  useEffect(() => {
    if (highlightMessageId) return
    scrollBottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, highlightMessageId])

  useEffect(() => {
    if (!highlightMessageId) return
    document
      .getElementById(`message-${highlightMessageId}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlightMessageId, messages.length])

  useEffect(() => {
    if (!localHighlightId) return
    const timeout = setTimeout(() => setLocalHighlightId(null), 2500)
    return () => clearTimeout(timeout)
  }, [localHighlightId])

  async function handlePinMessage(messageId: string) {
    try {
      await fijarMensaje(messageId)
    } catch (err) {
      console.error('No se pudo fijar el mensaje', err)
    }
  }

  async function handleUnpinMessage(messageId: string) {
    try {
      await desfijarMensaje(messageId)
    } catch (err) {
      console.error('No se pudo desfijar el mensaje', err)
    }
  }

  function handleJumpToMessage(messageId: string) {
    setPinnedDialogOpen(false)
    setLocalHighlightId(messageId)
    requestAnimationFrame(() => {
      document
        .getElementById(`message-${messageId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  function handlePickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      setUploadError(null)
      setPendingFile(file)
    }
  }

  function handleDragEnter(event: React.DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    dragCounterRef.current += 1
    setIsDraggingFile(true)
  }

  function handleDragOver(event: React.DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
  }

  function handleDragLeave(event: React.DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
    if (dragCounterRef.current === 0) setIsDraggingFile(false)
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    dragCounterRef.current = 0
    setIsDraggingFile(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      setUploadError(null)
      setPendingFile(file)
    }
  }

  async function submitDraft() {
    if (!draft.trim() && !pendingFile && !pendingVoiceBlob) return

    let attachment: ChatAttachment | undefined
    if (pendingVoiceBlob) {
      setUploading(true)
      setUploadError(null)
      try {
        const { url, tipo } = await subirNotaDeVoz(channel.id, pendingVoiceBlob)
        attachment = { url, type: tipo }
      } catch (err) {
        setUploadError(getErrorMessage(err))
        setUploading(false)
        return
      }
      setUploading(false)
    } else if (pendingFile) {
      setUploading(true)
      setUploadError(null)
      try {
        const { url, tipo } = await subirArchivoChat(channel.id, pendingFile)
        attachment = { url, type: tipo === 'imagen' ? 'image' : 'video' }
      } catch (err) {
        setUploadError(getErrorMessage(err))
        setUploading(false)
        return
      }
      setUploading(false)
    }

    onSendMessage({ ...parseFencedCode(draft), attachment, respuestaAId: replyingTo?.id })
    setDraft('')
    setPendingFile(null)
    setPendingVoiceBlob(null)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    submitDraft()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitDraft()
    }
  }

  function insertCodeFence() {
    setDraft((prev) => `${prev}${prev ? '\n' : ''}\`\`\`ts\n\n\`\`\``)
  }

  return (
    <section
      className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFile && (
        <div className="pointer-events-none absolute inset-2 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-background/90 text-primary">
          <ImageUp className="size-8" />
          <p className="text-sm font-medium">Soltá para adjuntar imagen, GIF o video</p>
        </div>
      )}

      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <HeaderIcon className="size-5 shrink-0 text-muted-foreground" />
          <h1 className="min-w-0 shrink truncate text-sm font-semibold text-foreground">
            {channel.name}
          </h1>
          {channel.topic && (
            <>
              <span className="h-4 w-px shrink-0 bg-border" />
              <p className="min-w-0 truncate text-sm text-muted-foreground">
                {channel.topic}
              </p>
            </>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <NotificationsDropdown userId={currentUserId} onNavigateToServer={onNavigateToServer} />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setPinnedDialogOpen(true)}
                aria-label="Mensajes fijados"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Pin className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Mensajes fijados</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Buscar"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Search className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Buscar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleMembers}
                aria-pressed={membersOpen}
                aria-label="Miembros"
                className={cn(
                  'flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                  membersOpen && 'bg-muted text-foreground'
                )}
              >
                <Users className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Miembros</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col justify-end gap-3 px-2 py-4">
          {groups.map((group, index) => (
            <div
              key={`${group.author.id}-${index}`}
              className="group/row flex items-start gap-3 rounded-md px-2 py-0.5 hover:bg-muted/30"
            >
              <UserProfileCard
                userId={group.author.id}
                server={server}
                currentUserId={currentUserId}
                onMessageUser={onMessageUser}
              >
                <button
                  type="button"
                  className="mt-0.5 shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Avatar size="lg">
                    {group.author.avatarUrl && (
                      <AvatarImage src={group.author.avatarUrl} />
                    )}
                    <AvatarFallback>
                      {group.author.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </UserProfileCard>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <UserProfileCard
                    userId={group.author.id}
                    server={server}
                    currentUserId={currentUserId}
                    onMessageUser={onMessageUser}
                  >
                    <button
                      type="button"
                      className="rounded text-sm font-semibold text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {group.author.name}
                    </button>
                  </UserProfileCard>
                  <span className="text-xs text-muted-foreground">
                    {group.timestamp}
                  </span>
                </div>
                {group.items.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    currentUserId={currentUserId}
                    canDeleteOthers={canDeleteOthers}
                    canPinMessages={canPinMessages}
                    serverId={server.id}
                    channelId={channel.id}
                    onEditMessage={onEditMessage}
                    onDeleteMessage={onDeleteMessage}
                    onReplyMessage={onReplyMessage}
                    onForwardMessage={onForwardMessage}
                    onPinMessage={handlePinMessage}
                    onUnpinMessage={handleUnpinMessage}
                    highlighted={highlightMessageId === message.id || localHighlightId === message.id}
                  />
                ))}
              </div>
            </div>
          ))}
          <div ref={scrollBottomRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 px-4 pb-4">
        {replyingTo && (
          <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
            <span className="min-w-0 flex-1 truncate">
              Respondiendo a <span className="font-medium">{replyingTo.authorName}</span>:{' '}
              {replyingTo.preview}
            </span>
            <button
              type="button"
              onClick={onCancelReply}
              aria-label="Cancelar respuesta"
              className="flex size-5 shrink-0 items-center justify-center rounded outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        {voiceRecorder.recording && (
          <VoiceMessageRecorder seconds={voiceRecorder.seconds} onCancel={voiceRecorder.cancel} />
        )}
        {!voiceRecorder.recording && pendingVoiceBlob && pendingVoicePreviewUrl && (
          <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-1.5 text-xs text-muted-foreground">
            <VoiceMessagePlayer url={pendingVoicePreviewUrl} className="w-auto flex-1 border-0 bg-transparent p-0" />
            <span className="shrink-0">{uploading ? 'Subiendo…' : null}</span>
            <button
              type="button"
              onClick={() => setPendingVoiceBlob(null)}
              disabled={uploading}
              aria-label="Descartar mensaje de voz"
              className="flex size-5 shrink-0 items-center justify-center self-start rounded outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        {voiceRecorder.error && (
          <p className="mb-1.5 text-xs text-destructive" role="alert">
            {voiceRecorder.error}
          </p>
        )}
        {pendingFile && pendingPreviewUrl && (
          <div className="mb-1.5 flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/40 p-1.5 text-xs text-muted-foreground">
            <div className="max-h-28 w-fit max-w-40 shrink-0 overflow-hidden rounded-md border border-border bg-background">
              {pendingFile.type.startsWith('video/') ? (
                <video src={pendingPreviewUrl} className="max-h-28 max-w-40" muted />
              ) : pendingFile.type.startsWith('image/') ? (
                <img src={pendingPreviewUrl} alt="" className="max-h-28 max-w-40" />
              ) : (
                <div className="flex size-16 items-center justify-center">
                  <Paperclip className="size-4" />
                </div>
              )}
            </div>
            <span className="min-w-0 flex-1 truncate">
              {uploading ? `Subiendo ${pendingFile.name}…` : pendingFile.name}
            </span>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              disabled={uploading}
              aria-label="Quitar archivo adjunto"
              className="flex size-5 shrink-0 items-center justify-center self-start rounded outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        {uploadError && (
          <p className="mb-1.5 text-xs text-destructive" role="alert">
            {uploadError}
          </p>
        )}
        <div
          className={cn(
            'flex items-end gap-1 rounded-xl border border-input bg-muted/40 px-2 py-1.5',
            'focus-within:ring-3 focus-within:ring-ring/50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={CHAT_ADJUNTO_ACCEPT}
            className="hidden"
            onChange={handlePickFile}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={voiceRecorder.recording || Boolean(pendingVoiceBlob)}
                aria-label="Adjuntar archivo"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
              >
                <Paperclip className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Adjuntar archivo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={insertCodeFence}
                aria-label="Insertar bloque de código"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Code2 className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Insertar bloque de código</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => (voiceRecorder.recording ? voiceRecorder.stop() : voiceRecorder.start())}
                disabled={Boolean(pendingFile)}
                aria-pressed={voiceRecorder.recording}
                aria-label={voiceRecorder.recording ? 'Detener grabación' : 'Grabar mensaje de voz'}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40',
                  voiceRecorder.recording && 'bg-destructive/10 text-destructive hover:text-destructive'
                )}
              >
                {voiceRecorder.recording ? <Square className="size-4" /> : <Mic className="size-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {voiceRecorder.recording ? 'Detener grabación' : 'Grabar mensaje de voz'}
            </TooltipContent>
          </Tooltip>

          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Enviar mensaje a #${channel.name}`}
            rows={1}
            className="max-h-52 min-h-8 flex-1 resize-none overflow-y-auto border-0 bg-transparent py-1 shadow-none focus-visible:ring-0"
          />

          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Emoji"
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Smile className="size-4" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Emoji</TooltipContent>
            </Tooltip>
            <PopoverContent side="top" align="end" className="w-auto p-0">
              <EmojiPicker onSelect={(emoji) => setDraft((prev) => prev + emoji)} />
            </PopoverContent>
          </Popover>

          <button
            type="submit"
            disabled={(!draft.trim() && !pendingFile && !pendingVoiceBlob) || uploading || voiceRecorder.recording}
            aria-label="Enviar mensaje"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-primary outline-none hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>

      <PinnedMessagesDialog
        open={pinnedDialogOpen}
        onOpenChange={setPinnedDialogOpen}
        channelId={channel.id}
        canUnpin={canPinMessages}
        onJumpToMessage={handleJumpToMessage}
      />
    </section>
  )
}

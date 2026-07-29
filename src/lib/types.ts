export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline'

export interface ChatUser {
  id: string
  name: string
  tag?: string
  avatarUrl?: string
  status: UserStatus
  statusText?: string
}

export interface ServerItem {
  id: string
  name: string
  ownerId: string
  iconUrl?: string
  inviteCode?: string
  unread?: boolean
  mentionCount?: number
}

export type ChannelType = 'text' | 'voice' | 'code' | 'announcement'

export interface ChannelItem {
  id: string
  name: string
  type: ChannelType
  topic?: string
  unread?: boolean
}

export interface ChannelCategory {
  id: string
  name: string
  channels: ChannelItem[]
}

export interface CodeBlock {
  language: string
  code: string
}

export interface ChatAttachment {
  url: string
  type: 'image' | 'video'
}

export interface ReplyPreview {
  id: string
  authorName: string
  preview: string
}

export interface ForwardedFrom {
  authorName: string
  origin: string
}

export interface ChatMessage {
  id: string
  author: ChatUser
  timestamp: string
  content?: string
  code?: CodeBlock
  attachment?: ChatAttachment
  editedAt?: string
  replyTo?: ReplyPreview
  forwardedFrom?: ForwardedFrom
}

export type FriendStatus =
  | 'pendiente_enviada'
  | 'pendiente_recibida'
  | 'aceptada'
  | 'bloqueada'

export interface Friend {
  id: string
  user: ChatUser
  status: FriendStatus
  since: string
}

export interface DMConversation {
  id: string
  otherUser: ChatUser
  lastMessageAt: string | null
  lastMessagePreview: string | null
  unreadCount: number
}

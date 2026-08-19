export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline'

export interface ChatUser {
  id: string
  name: string
  tag?: string
  avatarUrl?: string
  status: UserStatus
  statusText?: string
  backgroundUrl?: string
  backgroundType?: 'imagen' | 'video'
  isBot?: boolean
  isWebhook?: boolean
}

export type ServerVerificationLevel = 'ninguno' | 'bajo' | 'medio' | 'alto'
export type ServerHistoryRetention = '7d' | '30d' | '90d' | '1a' | 'para_siempre'
export type ServerDefaultNotifications = 'todos' | 'menciones'

export interface ServerItem {
  id: string
  name: string
  ownerId: string
  iconUrl?: string
  bannerUrl?: string
  inviteCode?: string
  unread?: boolean
  mentionCount?: number
  welcomeChannelId?: string
  rulesChannelId?: string
  verificationLevel: ServerVerificationLevel
  historyRetention: ServerHistoryRetention
  defaultNotifications: ServerDefaultNotifications
  communityEnabled: boolean
}

export type ChannelType = 'text' | 'voice' | 'code' | 'announcement' | 'forum'

export interface ChannelItem {
  id: string
  name: string
  type: ChannelType
  topic?: string
  unread?: boolean
  categoryId?: string | null
}

export interface ChannelCategory {
  id: string
  name: string
  description?: string
  channels: ChannelItem[]
}

export interface CodeBlock {
  language: string
  code: string
}

export interface ChatAttachment {
  url: string
  type: 'image' | 'video' | 'audio'
}

export interface MessageEmbedField {
  name: string
  value: string
}

export interface MessageEmbed {
  title?: string
  description?: string
  url?: string
  color?: string
  imageUrl?: string
  footer?: string
  fields?: MessageEmbedField[]
}

export interface MessageReaction {
  emoji: string
  userIds: string[]
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
  pinned?: boolean
  reactions?: MessageReaction[]
  embed?: MessageEmbed
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

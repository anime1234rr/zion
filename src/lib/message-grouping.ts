import type { ChatMessage, ChatUser } from '@/lib/types'

export interface MessageGroup {
  author: ChatUser
  timestamp: string
  items: ChatMessage[]
}

export function groupMessages(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  for (const message of messages) {
    const last = groups[groups.length - 1]
    if (last && last.author.id === message.author.id) {
      last.items.push(message)
    } else {
      groups.push({
        author: message.author,
        timestamp: message.timestamp,
        items: [message],
      })
    }
  }
  return groups
}

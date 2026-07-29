import { Copy, Forward, Link, Pencil, Reply, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface MessageAction {
  key: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  destructive?: boolean
}

export interface UseMessageActionsOptions {
  isOwnMessage: boolean
  canDeleteOthers: boolean
  onEdit: () => void
  onDelete: () => void
  onReply: () => void
  onForward: () => void
  onCopyId: () => void
  onCopyLink: () => void
}

export function useMessageActions({
  isOwnMessage,
  canDeleteOthers,
  onEdit,
  onDelete,
  onReply,
  onForward,
  onCopyId,
  onCopyLink,
}: UseMessageActionsOptions): MessageAction[] {
  const actions: MessageAction[] = []

  if (isOwnMessage) {
    actions.push({ key: 'edit', label: 'Editar mensaje', icon: Pencil, onSelect: onEdit })
  }

  actions.push({ key: 'reply', label: 'Responder', icon: Reply, onSelect: onReply })
  actions.push({ key: 'forward', label: 'Reenviar', icon: Forward, onSelect: onForward })
  actions.push({ key: 'copy-link', label: 'Copiar enlace', icon: Link, onSelect: onCopyLink })
  actions.push({ key: 'copy-id', label: 'Copiar ID del mensaje', icon: Copy, onSelect: onCopyId })

  if (isOwnMessage || canDeleteOthers) {
    actions.push({
      key: 'delete',
      label: 'Borrar mensaje',
      icon: Trash2,
      onSelect: onDelete,
      destructive: true,
    })
  }

  return actions
}

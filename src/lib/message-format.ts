import type { ChatAttachment, MessageReaction } from '@/lib/types'

const adjuntoTipoToAttachmentType: Record<string, ChatAttachment['type']> = {
  imagen: 'image',
  video: 'video',
  audio: 'audio',
}

export const attachmentTypeToAdjuntoTipo: Record<ChatAttachment['type'], string> = {
  image: 'imagen',
  video: 'video',
  audio: 'audio',
}

export function mapAdjunto(
  adjuntoUrl: string | null,
  adjuntoTipo: string | null
): ChatAttachment | undefined {
  if (!adjuntoUrl || !adjuntoTipo) return undefined
  const type = adjuntoTipoToAttachmentType[adjuntoTipo]
  if (!type) return undefined
  return { url: adjuntoUrl, type }
}

export function mapReacciones(
  rows: { usuario_id: string; emoji: string }[] | null | undefined
): MessageReaction[] | undefined {
  if (!rows || rows.length === 0) return undefined
  const porEmoji = new Map<string, string[]>()
  for (const row of rows) {
    const lista = porEmoji.get(row.emoji) ?? []
    lista.push(row.usuario_id)
    porEmoji.set(row.emoji, lista)
  }
  return Array.from(porEmoji.entries()).map(([emoji, userIds]) => ({ emoji, userIds }))
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const hora = date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const esHoy = date.toDateString() === now.toDateString()
  if (esHoy) return `Hoy a las ${hora}`

  const ayer = new Date(now)
  ayer.setDate(now.getDate() - 1)
  if (date.toDateString() === ayer.toDateString()) return `Ayer a las ${hora}`

  return `${date.toLocaleDateString('es-AR')} ${hora}`
}

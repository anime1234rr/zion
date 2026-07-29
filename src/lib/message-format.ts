import type { ChatAttachment } from '@/lib/types'

const adjuntoTipoToAttachmentType: Record<string, ChatAttachment['type']> = {
  imagen: 'image',
  video: 'video',
}

export const attachmentTypeToAdjuntoTipo: Record<ChatAttachment['type'], string> = {
  image: 'imagen',
  video: 'video',
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

import { supabase } from '@/lib/supabase'

const MB = 1024 * 1024

const BUCKET_LIMITS = {
  avatars: {
    maxBytes: 5 * MB,
    mimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  },
  iconos_servidores: {
    maxBytes: 5 * MB,
    mimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  },
  'user-banners': {
    maxBytes: 5 * MB,
    mimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  },
  'app-backgrounds': {
    maxBytes: 10 * MB,
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
    ],
  },
  'archivos-chat': {
    maxBytes: 15 * MB,
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
    ],
  },
} as const

type BucketId = keyof typeof BUCKET_LIMITS

function maxMbDe(bucket: BucketId): number {
  return Math.round(BUCKET_LIMITS[bucket].maxBytes / MB)
}

function validarTipoMime(bucket: BucketId, mimeType: string) {
  const { mimeTypes } = BUCKET_LIMITS[bucket]
  if (!(mimeTypes as readonly string[]).includes(mimeType)) {
    throw new Error(`Tipo de archivo no permitido. Formatos aceptados: ${mimeTypes.join(', ')}.`)
  }
}

function validarTamano(bucket: BucketId, size: number) {
  if (size > BUCKET_LIMITS[bucket].maxBytes) {
    throw new Error(`El archivo no puede pesar más de ${maxMbDe(bucket)} MB.`)
  }
}

function extensionDe(file: File | Blob, fallback: string): string {
  const nombre = file instanceof File ? file.name : ''
  return nombre.split('.').pop() || fallback
}

async function subirABucket(
  bucket: BucketId,
  path: string,
  archivo: File | Blob,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, archivo, {
    cacheControl: '3600',
    upsert: false,
    contentType,
  })
  if (error) throw error

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

async function comprimirImagenSiNecesario(
  file: File,
  maxBytes: number,
  maxDimension = 512
): Promise<File> {
  if (file.size <= maxBytes || file.type === 'image/gif') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const escala = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * escala))
  const height = Math.max(1, Math.round(bitmap.height * escala))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const nivelesDeCalidad = [0.92, 0.8, 0.68, 0.56, 0.44, 0.32]

  let mejorBlob: Blob | null = null
  for (const calidad of nivelesDeCalidad) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, calidad)
    )
    if (!blob) continue
    mejorBlob = blob
    if (blob.size <= maxBytes) break
  }

  if (!mejorBlob) return file
  const blob = mejorBlob

  const extension = outputType === 'image/png' ? 'png' : 'jpg'
  return new File([blob], `imagen.${extension}`, { type: outputType })
}

export const AVATAR_ACCEPT = BUCKET_LIMITS.avatars.mimeTypes.join(',')
export const ICONO_SERVIDOR_ACCEPT = BUCKET_LIMITS.iconos_servidores.mimeTypes.join(',')
export const BANNER_ACCEPT = BUCKET_LIMITS['user-banners'].mimeTypes.join(',')

export async function subirAvatar(userId: string, file: File): Promise<string> {
  validarTipoMime('avatars', file.type)
  const preparado = await comprimirImagenSiNecesario(file, BUCKET_LIMITS.avatars.maxBytes)
  validarTamano('avatars', preparado.size)

  const path = `${userId}/${crypto.randomUUID()}.${extensionDe(preparado, 'png')}`
  return subirABucket('avatars', path, preparado, preparado.type)
}

export async function subirIconoServidor(userId: string, file: File): Promise<string> {
  validarTipoMime('iconos_servidores', file.type)
  validarTamano('iconos_servidores', file.size)

  const path = `${userId}/${crypto.randomUUID()}.${extensionDe(file, 'png')}`
  return subirABucket('iconos_servidores', path, file, file.type)
}

export async function subirBanner(userId: string, file: File): Promise<string> {
  validarTipoMime('user-banners', file.type)
  validarTamano('user-banners', file.size)

  const path = `${userId}/${crypto.randomUUID()}.${extensionDe(file, 'png')}`
  return subirABucket('user-banners', path, file, file.type)
}

export async function subirBannerServidor(userId: string, file: File): Promise<string> {
  validarTipoMime('iconos_servidores', file.type)
  validarTamano('iconos_servidores', file.size)

  const path = `${userId}/${crypto.randomUUID()}.${extensionDe(file, 'png')}`
  return subirABucket('iconos_servidores', path, file, file.type)
}

const EXPRESION_MAX_SIZE_BYTES = 2 * MB

export async function subirExpresionServidor(servidorId: string, file: File): Promise<string> {
  validarTipoMime('iconos_servidores', file.type)
  if (file.size > EXPRESION_MAX_SIZE_BYTES) {
    throw new Error(
      `La imagen no puede pesar más de ${Math.round(EXPRESION_MAX_SIZE_BYTES / MB)} MB.`
    )
  }

  const path = `expresiones/${servidorId}/${crypto.randomUUID()}.${extensionDe(file, 'png')}`
  return subirABucket('iconos_servidores', path, file, file.type)
}

const CHAT_ADJUNTO_MIME_TIPOS: Record<string, 'imagen' | 'video'> = {
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/gif': 'imagen',
  'image/webp': 'imagen',
  'video/mp4': 'video',
  'video/webm': 'video',
}

export const CHAT_ADJUNTO_ACCEPT = Object.keys(CHAT_ADJUNTO_MIME_TIPOS).join(',')

export async function subirArchivoChat(
  canalId: string,
  file: File
): Promise<{ url: string; tipo: 'imagen' | 'video' }> {
  const tipo = CHAT_ADJUNTO_MIME_TIPOS[file.type]
  if (!tipo) {
    throw new Error('Solo se pueden adjuntar imágenes (jpeg, png, gif, webp) o videos (mp4, webm).')
  }
  validarTamano('archivos-chat', file.size)

  const path = `chat/${canalId}/${crypto.randomUUID()}.${extensionDe(file, tipo === 'imagen' ? 'png' : 'mp4')}`
  const url = await subirABucket('archivos-chat', path, file, file.type)
  return { url, tipo }
}

const VOZ_MIME_BASE_A_EXTENSION: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
}

export async function subirNotaDeVoz(
  canalId: string,
  blob: Blob
): Promise<{ url: string; tipo: 'audio' }> {
  const mimeBase = (blob.type || 'audio/webm').split(';')[0].trim()
  if (!VOZ_MIME_BASE_A_EXTENSION[mimeBase]) {
    throw new Error('Formato de audio no soportado.')
  }
  validarTamano('archivos-chat', blob.size)

  const path = `chat/${canalId}/${crypto.randomUUID()}.${VOZ_MIME_BASE_A_EXTENSION[mimeBase]}`
  const url = await subirABucket('archivos-chat', path, blob, mimeBase)
  return { url, tipo: 'audio' }
}

const FONDO_MIME_TIPOS: Record<string, 'imagen' | 'video'> = {
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/gif': 'imagen',
  'image/webp': 'imagen',
  'video/mp4': 'video',
  'video/webm': 'video',
}

export const FONDO_APP_ACCEPT = Object.keys(FONDO_MIME_TIPOS).join(',')

export async function subirFondoApp(
  userId: string,
  file: File
): Promise<{ url: string; tipo: 'imagen' | 'video' }> {
  const tipo = FONDO_MIME_TIPOS[file.type]
  if (!tipo) {
    throw new Error('Solo se pueden usar imágenes (jpeg, png, gif, webp) o videos (mp4, webm).')
  }
  validarTamano('app-backgrounds', file.size)

  const path = `${userId}/${crypto.randomUUID()}.${extensionDe(file, tipo === 'imagen' ? 'png' : 'mp4')}`
  const url = await subirABucket('app-backgrounds', path, file, file.type)
  return { url, tipo }
}

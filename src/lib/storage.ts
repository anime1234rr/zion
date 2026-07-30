import { supabase } from '@/lib/supabase'

const MAX_SIZE_BYTES = 5 * 1024 * 1024

function assertImagenValida(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen.')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('La imagen no puede pesar más de 5 MB.')
  }
}

async function subirImagen(
  bucket: 'avatars' | 'iconos_servidores',
  ownerId: string,
  file: File
): Promise<string> {
  assertImagenValida(file)

  const extension = file.name.split('.').pop() ?? 'png'
  const path = `${ownerId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export function subirAvatar(userId: string, file: File) {
  return subirImagen('avatars', userId, file)
}

export function subirIconoServidor(userId: string, file: File) {
  return subirImagen('iconos_servidores', userId, file)
}

const CHAT_MAX_SIZE_BYTES = 50 * 1024 * 1024
const CHAT_MIME_A_TIPO: Record<string, 'imagen' | 'video'> = {
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/gif': 'imagen',
  'image/webp': 'imagen',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
}

export const CHAT_ADJUNTO_ACCEPT = Object.keys(CHAT_MIME_A_TIPO).join(',')

function assertArchivoChatValido(file: File): 'imagen' | 'video' {
  const tipo = CHAT_MIME_A_TIPO[file.type]
  if (!tipo) {
    throw new Error('Solo se pueden adjuntar imágenes (jpeg, png, gif, webp) o videos (mp4, webm, mov).')
  }
  if (file.size > CHAT_MAX_SIZE_BYTES) {
    throw new Error('El archivo no puede pesar más de 50 MB.')
  }
  return tipo
}

export async function subirArchivoChat(
  canalId: string,
  file: File
): Promise<{ url: string; tipo: 'imagen' | 'video' }> {
  const tipo = assertArchivoChatValido(file)

  const extension = file.name.split('.').pop() ?? (tipo === 'imagen' ? 'png' : 'mp4')
  const path = `chat/${canalId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from('archivos-chat').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error

  const url = supabase.storage.from('archivos-chat').getPublicUrl(path).data.publicUrl
  return { url, tipo }
}

const VOZ_MAX_SIZE_BYTES = 15 * 1024 * 1024

export async function subirNotaDeVoz(canalId: string, blob: Blob): Promise<{ url: string; tipo: 'audio' }> {
  if (blob.size > VOZ_MAX_SIZE_BYTES) {
    throw new Error('El mensaje de voz no puede pesar más de 15 MB.')
  }

  const path = `chat/${canalId}/${crypto.randomUUID()}.webm`

  const { error } = await supabase.storage.from('archivos-chat').upload(path, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: blob.type || 'audio/webm',
  })
  if (error) throw error

  const url = supabase.storage.from('archivos-chat').getPublicUrl(path).data.publicUrl
  return { url, tipo: 'audio' }
}

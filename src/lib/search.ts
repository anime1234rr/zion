import { supabase } from '@/lib/supabase'
import { mapPerfilToChatUser, type PerfilRow } from '@/lib/profiles'
import type { ChatAttachment, ChatUser } from '@/lib/types'

export type SearchScope = 'channel' | 'server'

export interface MessageSearchFilters {
  query: string
  autorId?: string | null
  adjuntoTipo?: ChatAttachment['type'] | null
}

export interface MessageSearchResult {
  id: string
  canalId: string
  canalNombre: string
  contenido: string
  esCodigo: boolean
  attachment?: ChatAttachment
  creadoAt: string
  author: ChatUser
}

const adjuntoTipoToAttachmentType: Record<string, ChatAttachment['type']> = {
  imagen: 'image',
  video: 'video',
  audio: 'audio',
}

const attachmentTypeToAdjuntoTipo: Record<ChatAttachment['type'], string> = {
  image: 'imagen',
  video: 'video',
  audio: 'audio',
}

interface BuscarMensajesRow {
  id: string
  canal_id: string
  canal_nombre: string
  usuario_id: string
  contenido: string
  tipo_mensaje: string
  adjunto_url: string | null
  adjunto_tipo: string | null
  creado_at: string
  autor_nombre_usuario: string
  autor_nombre_completo: string | null
  autor_avatar_url: string | null
}

function mapMensajeResultado(row: BuscarMensajesRow): MessageSearchResult {
  return {
    id: row.id,
    canalId: row.canal_id,
    canalNombre: row.canal_nombre,
    contenido: row.contenido,
    esCodigo: row.tipo_mensaje === 'fragmento_codigo',
    attachment:
      row.adjunto_url && row.adjunto_tipo
        ? { url: row.adjunto_url, type: adjuntoTipoToAttachmentType[row.adjunto_tipo] ?? 'image' }
        : undefined,
    creadoAt: row.creado_at,
    author: {
      id: row.usuario_id,
      name: row.autor_nombre_completo?.trim() || row.autor_nombre_usuario,
      avatarUrl: row.autor_avatar_url ?? undefined,
      status: 'offline',
    },
  }
}

export async function buscarMensajes(
  servidorId: string,
  scope: { type: SearchScope; canalId: string },
  filtros: MessageSearchFilters
): Promise<MessageSearchResult[]> {
  const termino = filtros.query.trim()
  if (!termino && !filtros.autorId && !filtros.adjuntoTipo) return []

  const { data, error } = await supabase.rpc('buscar_mensajes', {
    p_servidor_id: servidorId,
    p_query: termino || null,
    p_canal_id: scope.type === 'channel' ? scope.canalId : null,
    p_autor_id: filtros.autorId ?? null,
    p_adjunto_tipo: filtros.adjuntoTipo ? attachmentTypeToAdjuntoTipo[filtros.adjuntoTipo] : null,
    p_limite: 30,
  })

  if (error) throw error
  return ((data ?? []) as BuscarMensajesRow[]).map(mapMensajeResultado)
}

export async function buscarUsuariosEnServidor(
  servidorId: string,
  termino: string
): Promise<ChatUser[]> {
  const query = termino.trim()
  if (!query) return []

  const { data, error } = await supabase.rpc('buscar_usuarios_servidor', {
    p_servidor_id: servidorId,
    p_query: query,
    p_limite: 8,
  })

  if (error) throw error
  return ((data ?? []) as PerfilRow[]).map(mapPerfilToChatUser)
}

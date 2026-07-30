import { supabase } from '@/lib/supabase'
import { formatFencedCode, parseFencedCode } from '@/lib/code-fence'
import { attachmentTypeToAdjuntoTipo, formatTimestamp, mapAdjunto, mapReacciones } from '@/lib/message-format'
import { mapPerfilToChatUser, type PerfilRow } from '@/lib/profiles'
import type { ChatAttachment, ChatMessage, CodeBlock, ForwardedFrom, ReplyPreview } from '@/lib/types'

const MENSAJE_SELECT =
  '*, perfiles!mensajes_usuario_id_fkey(*), mensaje_respondido:respuesta_a_id(id, contenido, tipo_mensaje, perfiles!mensajes_usuario_id_fkey(*)), reacciones_mensajes(usuario_id, emoji)'

interface MensajeRespondidoRow {
  id: string
  contenido: string
  tipo_mensaje: string
  perfiles: PerfilRow | null
}

interface MensajeRow {
  id: string
  canal_id: string
  usuario_id: string
  contenido: string
  tipo_mensaje: string
  adjunto_url: string | null
  adjunto_tipo: string | null
  creado_at: string
  editado_en: string | null
  reenviado_de_autor_nombre: string | null
  reenviado_de_origen: string | null
  fijado: boolean
  perfiles: PerfilRow | null
  mensaje_respondido: MensajeRespondidoRow | null
  reacciones_mensajes: { usuario_id: string; emoji: string }[] | null
}

function previewDeContenido(tipoMensaje: string, contenido: string): string {
  if (tipoMensaje === 'fragmento_codigo') return 'Código'
  const oneLine = contenido.replace(/\s+/g, ' ').trim()
  return oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine
}

function mapReplyPreview(row: MensajeRespondidoRow | null): ReplyPreview | undefined {
  if (!row) return undefined
  const authorName = row.perfiles
    ? mapPerfilToChatUser(row.perfiles).name
    : 'Usuario'
  return {
    id: row.id,
    authorName,
    preview: previewDeContenido(row.tipo_mensaje, row.contenido),
  }
}

function mapForwardedFrom(row: MensajeRow): ForwardedFrom | undefined {
  if (!row.reenviado_de_autor_nombre) return undefined
  return {
    authorName: row.reenviado_de_autor_nombre,
    origin: row.reenviado_de_origen ?? '',
  }
}

function mapMensajeRow(row: MensajeRow): ChatMessage {
  const author = row.perfiles
    ? mapPerfilToChatUser(row.perfiles)
    : { id: row.usuario_id, name: 'Usuario', status: 'offline' as const }

  const base = {
    id: row.id,
    author,
    timestamp: formatTimestamp(row.creado_at),
    attachment: mapAdjunto(row.adjunto_url, row.adjunto_tipo),
    editedAt: row.editado_en ?? undefined,
    replyTo: mapReplyPreview(row.mensaje_respondido),
    forwardedFrom: mapForwardedFrom(row),
    pinned: row.fijado,
    reactions: mapReacciones(row.reacciones_mensajes),
  }

  if (row.tipo_mensaje === 'fragmento_codigo') {
    const { code } = parseFencedCode(row.contenido)
    return { ...base, code: code ?? { language: 'text', code: row.contenido } }
  }

  return { ...base, content: row.contenido }
}

export async function listarMensajes(canalId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('mensajes')
    .select(MENSAJE_SELECT)
    .eq('canal_id', canalId)
    .order('creado_at', { ascending: true })
    .returns<MensajeRow[]>()

  if (error) throw error
  return (data ?? []).map(mapMensajeRow)
}

export async function enviarMensaje(
  canalId: string,
  usuarioId: string,
  message: {
    content?: string
    code?: CodeBlock
    attachment?: ChatAttachment
    respuestaAId?: string
    reenviadoDe?: { autorId?: string; autorNombre: string; origen: string }
  }
): Promise<ChatMessage> {
  const contenido = message.code
    ? formatFencedCode(message.code)
    : (message.content ?? '')
  const tipo_mensaje = message.code ? 'fragmento_codigo' : 'texto'

  const { data, error } = await supabase
    .from('mensajes')
    .insert({
      canal_id: canalId,
      usuario_id: usuarioId,
      contenido,
      tipo_mensaje,
      adjunto_url: message.attachment?.url ?? null,
      adjunto_tipo: message.attachment
        ? attachmentTypeToAdjuntoTipo[message.attachment.type]
        : null,
      respuesta_a_id: message.respuestaAId ?? null,
      reenviado_de_autor_id: message.reenviadoDe?.autorId ?? null,
      reenviado_de_autor_nombre: message.reenviadoDe?.autorNombre ?? null,
      reenviado_de_origen: message.reenviadoDe?.origen ?? null,
    })
    .select(MENSAJE_SELECT)
    .single<MensajeRow>()

  if (error) throw error
  return mapMensajeRow(data)
}

export async function editarMensaje(mensajeId: string, contenido: string): Promise<ChatMessage> {
  const { error } = await supabase.rpc('editar_mensaje', {
    p_mensaje_id: mensajeId,
    p_contenido: contenido,
  })
  if (error) throw error

  const mensaje = await fetchMensajeCompleto(mensajeId)
  if (!mensaje) throw new Error('No se pudo cargar el mensaje editado.')
  return mensaje
}

export async function eliminarMensaje(mensajeId: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_mensaje', { p_mensaje_id: mensajeId })
  if (error) throw error
}

export async function fijarMensaje(mensajeId: string): Promise<void> {
  const { error } = await supabase.rpc('fijar_mensaje', { p_mensaje_id: mensajeId })
  if (error) throw error
}

export async function desfijarMensaje(mensajeId: string): Promise<void> {
  const { error } = await supabase.rpc('desfijar_mensaje', { p_mensaje_id: mensajeId })
  if (error) throw error
}

export async function alternarReaccionMensaje(mensajeId: string, emoji: string): Promise<void> {
  const { error } = await supabase.rpc('alternar_reaccion_mensaje', {
    p_mensaje_id: mensajeId,
    p_emoji: emoji,
  })
  if (error) throw error
}

export async function listarMensajesFijados(canalId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('mensajes')
    .select(MENSAJE_SELECT)
    .eq('canal_id', canalId)
    .eq('fijado', true)
    .order('creado_at', { ascending: false })
    .returns<MensajeRow[]>()

  if (error) throw error
  return (data ?? []).map(mapMensajeRow)
}

async function fetchMensajeCompleto(mensajeId: string): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('mensajes')
    .select(MENSAJE_SELECT)
    .eq('id', mensajeId)
    .maybeSingle<MensajeRow>()

  if (error) throw error
  return data ? mapMensajeRow(data) : null
}

interface SuscribirseACanalHandlers {
  onNuevoMensaje: (mensaje: ChatMessage) => void
  onMensajeEditado?: (mensaje: ChatMessage) => void
  onMensajeEliminado?: (mensajeId: string) => void
}

export function suscribirseACanal(canalId: string, handlers: SuscribirseACanalHandlers) {
  const { onNuevoMensaje, onMensajeEditado, onMensajeEliminado } = handlers

  const channel = supabase
    .channel(`mensajes-canal-${canalId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `canal_id=eq.${canalId}`,
      },
      async (payload) => {
        const row = payload.new as Pick<MensajeRow, 'id'>
        const mensaje = await fetchMensajeCompleto(row.id)
        if (mensaje) onNuevoMensaje(mensaje)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'mensajes',
        filter: `canal_id=eq.${canalId}`,
      },
      async (payload) => {
        if (!onMensajeEditado) return
        const row = payload.new as Pick<MensajeRow, 'id'>
        const mensaje = await fetchMensajeCompleto(row.id)
        if (mensaje) onMensajeEditado(mensaje)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'mensajes',
        filter: `canal_id=eq.${canalId}`,
      },
      (payload) => {
        const row = payload.old as { id: string }
        onMensajeEliminado?.(row.id)
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reacciones_mensajes',
        filter: `canal_id=eq.${canalId}`,
      },
      async (payload) => {
        if (!onMensajeEditado) return
        const row = (payload.new ?? payload.old) as { mensaje_id: string }
        const mensaje = await fetchMensajeCompleto(row.mensaje_id)
        if (mensaje) onMensajeEditado(mensaje)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

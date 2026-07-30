import { supabase } from '@/lib/supabase'
import { formatFencedCode, parseFencedCode } from '@/lib/code-fence'
import { attachmentTypeToAdjuntoTipo, formatTimestamp, mapAdjunto, mapReacciones } from '@/lib/message-format'
import { mapPerfilToChatUser, type PerfilRow } from '@/lib/profiles'
import type {
  ChatAttachment,
  ChatMessage,
  ChatUser,
  CodeBlock,
  DMConversation,
  ForwardedFrom,
  ReplyPreview,
} from '@/lib/types'

const MENSAJE_DIRECTO_SELECT =
  '*, perfiles!mensajes_directos_usuario_id_fkey(*), mensaje_respondido:respuesta_a_id(id, contenido, tipo_mensaje, perfiles!mensajes_directos_usuario_id_fkey(*)), reacciones_mensajes_directos(usuario_id, emoji)'

interface ConversacionRow {
  id: string
  usuario_menor_id: string
  usuario_mayor_id: string
  ultimo_mensaje_at: string | null
  ultimo_mensaje_preview: string | null
  leido_hasta_menor: string | null
  leido_hasta_mayor: string | null
  creado_at: string
  menor: PerfilRow | null
  mayor: PerfilRow | null
}

interface MensajeRespondidoRow {
  id: string
  contenido: string
  tipo_mensaje: string
  perfiles: PerfilRow | null
}

interface MensajeDirectoRow {
  id: string
  conversacion_id: string
  usuario_id: string
  contenido: string
  tipo_mensaje: string
  adjunto_url: string | null
  adjunto_tipo: string | null
  creado_at: string
  editado_en: string | null
  reenviado_de_autor_nombre: string | null
  reenviado_de_origen: string | null
  perfiles: PerfilRow | null
  mensaje_respondido: MensajeRespondidoRow | null
  reacciones_mensajes_directos: { usuario_id: string; emoji: string }[] | null
}

function mapConversacion(row: ConversacionRow, currentUserId: string): DMConversation {
  const esMenor = row.usuario_menor_id === currentUserId
  const otroPerfil = esMenor ? row.mayor : row.menor
  const otroId = esMenor ? row.usuario_mayor_id : row.usuario_menor_id
  const leidoHasta = esMenor ? row.leido_hasta_menor : row.leido_hasta_mayor

  const otherUser: ChatUser = otroPerfil
    ? mapPerfilToChatUser(otroPerfil)
    : { id: otroId, name: 'Usuario', status: 'offline' }

  const hayNoLeidos = Boolean(
    row.ultimo_mensaje_at &&
      (!leidoHasta || new Date(leidoHasta) < new Date(row.ultimo_mensaje_at))
  )

  return {
    id: row.id,
    otherUser,
    lastMessageAt: row.ultimo_mensaje_at,
    lastMessagePreview: row.ultimo_mensaje_preview,
    unreadCount: hayNoLeidos ? 1 : 0,
  }
}

function previewDeContenido(tipoMensaje: string, contenido: string): string {
  if (tipoMensaje === 'fragmento_codigo') return 'Código'
  const oneLine = contenido.replace(/\s+/g, ' ').trim()
  return oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine
}

function mapReplyPreview(row: MensajeRespondidoRow | null): ReplyPreview | undefined {
  if (!row) return undefined
  const authorName = row.perfiles ? mapPerfilToChatUser(row.perfiles).name : 'Usuario'
  return {
    id: row.id,
    authorName,
    preview: previewDeContenido(row.tipo_mensaje, row.contenido),
  }
}

function mapForwardedFrom(row: MensajeDirectoRow): ForwardedFrom | undefined {
  if (!row.reenviado_de_autor_nombre) return undefined
  return { authorName: row.reenviado_de_autor_nombre, origin: row.reenviado_de_origen ?? '' }
}

function mapMensajeDirectoRow(row: MensajeDirectoRow): ChatMessage {
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
    reactions: mapReacciones(row.reacciones_mensajes_directos),
  }

  if (row.tipo_mensaje === 'fragmento_codigo') {
    const { code } = parseFencedCode(row.contenido)
    return { ...base, code: code ?? { language: 'text', code: row.contenido } }
  }

  return { ...base, content: row.contenido }
}

export async function listarConversaciones(currentUserId: string): Promise<DMConversation[]> {
  const { data, error } = await supabase
    .from('conversaciones_directas')
    .select('*, menor:usuario_menor_id(*), mayor:usuario_mayor_id(*)')
    .or(`usuario_menor_id.eq.${currentUserId},usuario_mayor_id.eq.${currentUserId}`)
    .order('ultimo_mensaje_at', { ascending: false, nullsFirst: false })
    .returns<ConversacionRow[]>()

  if (error) throw error
  return (data ?? []).map((row) => mapConversacion(row, currentUserId))
}

export async function obtenerConversacion(
  conversacionId: string,
  currentUserId: string
): Promise<DMConversation | null> {
  const { data, error } = await supabase
    .from('conversaciones_directas')
    .select('*, menor:usuario_menor_id(*), mayor:usuario_mayor_id(*)')
    .eq('id', conversacionId)
    .maybeSingle<ConversacionRow>()

  if (error) throw error
  return data ? mapConversacion(data, currentUserId) : null
}

export async function obtenerOCrearConversacion(otroUsuarioId: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('obtener_o_crear_conversacion_directa', { p_otro_usuario_id: otroUsuarioId })
    .single<{ id: string }>()

  if (error) throw error
  if (!data) throw new Error('No se pudo abrir la conversación.')
  return data.id
}

export async function listarMensajesDirectos(conversacionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('mensajes_directos')
    .select(MENSAJE_DIRECTO_SELECT)
    .eq('conversacion_id', conversacionId)
    .order('creado_at', { ascending: true })
    .returns<MensajeDirectoRow[]>()

  if (error) throw error
  return (data ?? []).map(mapMensajeDirectoRow)
}

export async function enviarMensajeDirecto(
  conversacionId: string,
  message: {
    content?: string
    code?: CodeBlock
    attachment?: ChatAttachment
    respuestaAId?: string
    reenviadoDe?: { autorId?: string; autorNombre: string; origen: string }
  }
): Promise<ChatMessage> {
  const contenido = message.code ? formatFencedCode(message.code) : (message.content ?? '')
  const tipo_mensaje = message.code ? 'fragmento_codigo' : 'texto'

  const { data, error } = await supabase
    .rpc('enviar_mensaje_directo', {
      p_conversacion_id: conversacionId,
      p_contenido: contenido,
      p_tipo_mensaje: tipo_mensaje,
      p_adjunto_url: message.attachment?.url ?? null,
      p_adjunto_tipo: message.attachment
        ? attachmentTypeToAdjuntoTipo[message.attachment.type]
        : null,
      p_respuesta_a_id: message.respuestaAId ?? null,
      p_reenviado_de_autor_id: message.reenviadoDe?.autorId ?? null,
      p_reenviado_de_autor_nombre: message.reenviadoDe?.autorNombre ?? null,
      p_reenviado_de_origen: message.reenviadoDe?.origen ?? null,
    })
    .single<Pick<MensajeDirectoRow, 'id'>>()

  if (error) throw error
  if (!data) throw new Error('No se pudo enviar el mensaje.')

  const mensaje = await fetchMensajeDirectoCompleto(data.id)
  if (!mensaje) throw new Error('No se pudo cargar el mensaje enviado.')
  return mensaje
}

export async function editarMensajeDirecto(mensajeId: string, contenido: string): Promise<ChatMessage> {
  const { error } = await supabase.rpc('editar_mensaje_directo', {
    p_mensaje_id: mensajeId,
    p_contenido: contenido,
  })
  if (error) throw error

  const mensaje = await fetchMensajeDirectoCompleto(mensajeId)
  if (!mensaje) throw new Error('No se pudo cargar el mensaje editado.')
  return mensaje
}

export async function alternarReaccionMensajeDirecto(mensajeId: string, emoji: string): Promise<void> {
  const { error } = await supabase.rpc('alternar_reaccion_mensaje_directo', {
    p_mensaje_id: mensajeId,
    p_emoji: emoji,
  })
  if (error) throw error
}

export async function eliminarMensajeDirecto(mensajeId: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_mensaje_directo', { p_mensaje_id: mensajeId })
  if (error) throw error
}

async function fetchMensajeDirectoCompleto(mensajeId: string): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('mensajes_directos')
    .select(MENSAJE_DIRECTO_SELECT)
    .eq('id', mensajeId)
    .maybeSingle<MensajeDirectoRow>()

  if (error) throw error
  return data ? mapMensajeDirectoRow(data) : null
}

export async function marcarConversacionLeida(conversacionId: string): Promise<void> {
  const { error } = await supabase.rpc('marcar_conversacion_leida', {
    p_conversacion_id: conversacionId,
  })
  if (error) throw error
}

export function suscribirseAConversaciones(userId: string, onCambio: () => void) {
  const channel = supabase
    .channel(`conversaciones-${userId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversaciones_directas',
        filter: `usuario_menor_id=eq.${userId}`,
      },
      () => onCambio()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversaciones_directas',
        filter: `usuario_mayor_id=eq.${userId}`,
      },
      () => onCambio()
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

interface SuscribirseAConversacionHandlers {
  onNuevoMensaje: (mensaje: ChatMessage) => void
  onMensajeEditado?: (mensaje: ChatMessage) => void
  onMensajeEliminado?: (mensajeId: string) => void
}

export function suscribirseAConversacion(
  conversacionId: string,
  handlers: SuscribirseAConversacionHandlers
) {
  const { onNuevoMensaje, onMensajeEditado, onMensajeEliminado } = handlers

  const channel = supabase
    .channel(`mensajes-directos-${conversacionId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes_directos',
        filter: `conversacion_id=eq.${conversacionId}`,
      },
      async (payload) => {
        const row = payload.new as Pick<MensajeDirectoRow, 'id'>
        const mensaje = await fetchMensajeDirectoCompleto(row.id)
        if (mensaje) onNuevoMensaje(mensaje)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'mensajes_directos',
        filter: `conversacion_id=eq.${conversacionId}`,
      },
      async (payload) => {
        if (!onMensajeEditado) return
        const row = payload.new as Pick<MensajeDirectoRow, 'id'>
        const mensaje = await fetchMensajeDirectoCompleto(row.id)
        if (mensaje) onMensajeEditado(mensaje)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'mensajes_directos',
        filter: `conversacion_id=eq.${conversacionId}`,
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
        table: 'reacciones_mensajes_directos',
        filter: `conversacion_id=eq.${conversacionId}`,
      },
      async (payload) => {
        if (!onMensajeEditado) return
        const row = (payload.new ?? payload.old) as { mensaje_id: string }
        const mensaje = await fetchMensajeDirectoCompleto(row.mensaje_id)
        if (mensaje) onMensajeEditado(mensaje)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

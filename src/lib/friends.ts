import { supabase } from '@/lib/supabase'
import { mapPerfilToChatUser, type PerfilRow } from '@/lib/profiles'
import type { ChatUser, Friend, FriendStatus } from '@/lib/types'

interface AmistadRow {
  id: string
  usuario_menor_id: string
  usuario_mayor_id: string
  solicitante_id: string
  estado: string
  creado_at: string
  actualizado_at: string
  menor: PerfilRow | null
  mayor: PerfilRow | null
}

function mapAmistad(row: AmistadRow, currentUserId: string): Friend {
  const esMenor = row.usuario_menor_id === currentUserId
  const otroPerfil = esMenor ? row.mayor : row.menor
  const otroId = esMenor ? row.usuario_mayor_id : row.usuario_menor_id

  const user: ChatUser = otroPerfil
    ? mapPerfilToChatUser(otroPerfil)
    : { id: otroId, name: 'Usuario', status: 'offline' }

  let status: FriendStatus
  if (row.estado === 'bloqueada') {
    status = 'bloqueada'
  } else if (row.estado === 'aceptada') {
    status = 'aceptada'
  } else {
    status = row.solicitante_id === currentUserId ? 'pendiente_enviada' : 'pendiente_recibida'
  }

  return {
    id: row.id,
    user,
    status,
    since: row.actualizado_at,
  }
}

export async function listarAmistades(currentUserId: string): Promise<Friend[]> {
  const { data, error } = await supabase
    .from('amistades')
    .select('*, menor:usuario_menor_id(*), mayor:usuario_mayor_id(*)')
    .or(`usuario_menor_id.eq.${currentUserId},usuario_mayor_id.eq.${currentUserId}`)
    .returns<AmistadRow[]>()

  if (error) throw error
  return (data ?? []).map((row) => mapAmistad(row, currentUserId))
}

export async function buscarUsuarioPorNombre(
  nombre: string,
  excludeUserId: string
): Promise<ChatUser[]> {
  const termino = nombre.trim()
  if (!termino) return []

  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .or(`nombre_usuario.ilike.%${termino}%,nombre_completo.ilike.%${termino}%`)
    .neq('id', excludeUserId)
    .limit(10)
    .returns<PerfilRow[]>()

  if (error) throw error
  return (data ?? []).map(mapPerfilToChatUser)
}

export async function enviarSolicitudAmistad(usuarioId: string): Promise<void> {
  const { error } = await supabase.rpc('enviar_solicitud_amistad', {
    p_destinatario_id: usuarioId,
  })
  if (error) throw error
}

export async function aceptarSolicitudAmistad(amistadId: string): Promise<void> {
  const { error } = await supabase.rpc('aceptar_solicitud_amistad', {
    p_amistad_id: amistadId,
  })
  if (error) throw error
}

export async function rechazarSolicitudAmistad(amistadId: string): Promise<void> {
  const { error } = await supabase.rpc('rechazar_solicitud_amistad', {
    p_amistad_id: amistadId,
  })
  if (error) throw error
}

export async function bloquearUsuario(usuarioId: string): Promise<void> {
  const { error } = await supabase.rpc('bloquear_usuario', { p_usuario_id: usuarioId })
  if (error) throw error
}

export async function desbloquearUsuario(usuarioId: string): Promise<void> {
  const { error } = await supabase.rpc('desbloquear_usuario', { p_usuario_id: usuarioId })
  if (error) throw error
}

export async function eliminarAmistad(usuarioId: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_amistad', { p_usuario_id: usuarioId })
  if (error) throw error
}

export function suscribirseAAmistades(userId: string, onCambio: () => void) {
  const channel = supabase
    .channel(`amistades-${userId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'amistades',
        filter: `usuario_menor_id=eq.${userId}`,
      },
      () => onCambio()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'amistades',
        filter: `usuario_mayor_id=eq.${userId}`,
      },
      () => onCambio()
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'perfiles' },
      () => onCambio()
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

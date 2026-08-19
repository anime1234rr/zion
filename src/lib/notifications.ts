import { supabase } from '@/lib/supabase'

export type NotificationType =
  | 'mencion'
  | 'invitacion'
  | 'sistema'
  | 'mensaje_privado'
  | 'solicitud_amistad'

export interface AppNotification {
  id: string
  servidorId: string | null
  tipo: NotificationType
  titulo: string
  mensaje: string
  leida: boolean
  enlace: string | null
  creadoAt: string
}

interface NotificacionRow {
  id: string
  usuario_id: string
  servidor_id: string | null
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  enlace: string | null
  creado_at: string
}

function mapNotificacion(row: NotificacionRow): AppNotification {
  return {
    id: row.id,
    servidorId: row.servidor_id,
    tipo: row.tipo as NotificationType,
    titulo: row.titulo,
    mensaje: row.mensaje,
    leida: row.leida,
    enlace: row.enlace,
    creadoAt: row.creado_at,
  }
}

export async function listarNotificaciones(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', userId)
    .order('creado_at', { ascending: false })
    .limit(50)
    .returns<NotificacionRow[]>()

  if (error) throw error
  return (data ?? []).map(mapNotificacion)
}

export async function marcarNotificacionLeida(notificacionId?: string): Promise<void> {
  const { error } = await supabase.rpc('marcar_notificaciones_leidas', {
    p_notificacion_id: notificacionId ?? null,
  })
  if (error) throw error
}

export async function crearNotificacionMencion(params: {
  usuarioId: string
  servidorId: string
  titulo: string
  mensaje: string
  enlace?: string | null
}): Promise<void> {
  const { error } = await supabase.rpc('crear_notificacion', {
    p_usuario_id: params.usuarioId,
    p_servidor_id: params.servidorId,
    p_tipo: 'mencion',
    p_titulo: params.titulo,
    p_mensaje: params.mensaje,
    p_enlace: params.enlace ?? null,
  })
  if (error) throw error
}

export async function eliminarNotificacion(notificacionId: string): Promise<void> {
  const { error } = await supabase
    .from('notificaciones')
    .delete()
    .eq('id', notificacionId)

  if (error) throw error
}

export function suscribirseANotificaciones(
  userId: string,
  onNueva: (notificacion: AppNotification) => void
) {
  const channel = supabase
    .channel(`notificaciones-${userId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${userId}`,
      },
      (payload) => {
        onNueva(mapNotificacion(payload.new as NotificacionRow))
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

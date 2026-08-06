import { supabase } from '@/lib/supabase'
import type {
  ChannelType,
  ServerDefaultNotifications,
  ServerHistoryRetention,
  ServerItem,
  ServerVerificationLevel,
} from '@/lib/types'

interface ServidorRow {
  id: string
  nombre: string
  icono_url: string | null
  banner_url: string | null
  propietario_id: string
  codigo_invitacion: string | null
  creado_at: string
  canal_bienvenida_id: string | null
  canal_normas_id: string | null
  nivel_verificacion: string
  retencion_historial: string
  notificaciones_por_defecto: string
}

export const tipoCanalToChannelType: Record<string, ChannelType> = {
  texto: 'text',
  voz: 'voice',
  codigo: 'code',
  anuncios: 'announcement',
}

const NIVELES_VERIFICACION: ServerVerificationLevel[] = ['ninguno', 'bajo', 'medio', 'alto']
const RETENCIONES_HISTORIAL: ServerHistoryRetention[] = ['7d', '30d', '90d', '1a', 'para_siempre']
const NOTIFICACIONES_POR_DEFECTO: ServerDefaultNotifications[] = ['todos', 'menciones']

function mapServidorToServerItem(row: ServidorRow): ServerItem {
  return {
    id: row.id,
    name: row.nombre,
    ownerId: row.propietario_id,
    iconUrl: row.icono_url ?? undefined,
    bannerUrl: row.banner_url ?? undefined,
    inviteCode: row.codigo_invitacion ?? undefined,
    welcomeChannelId: row.canal_bienvenida_id ?? undefined,
    rulesChannelId: row.canal_normas_id ?? undefined,
    verificationLevel: NIVELES_VERIFICACION.includes(row.nivel_verificacion as ServerVerificationLevel)
      ? (row.nivel_verificacion as ServerVerificationLevel)
      : 'ninguno',
    historyRetention: RETENCIONES_HISTORIAL.includes(row.retencion_historial as ServerHistoryRetention)
      ? (row.retencion_historial as ServerHistoryRetention)
      : 'para_siempre',
    defaultNotifications: NOTIFICACIONES_POR_DEFECTO.includes(
      row.notificaciones_por_defecto as ServerDefaultNotifications
    )
      ? (row.notificaciones_por_defecto as ServerDefaultNotifications)
      : 'todos',
  }
}

export async function listarServidores(): Promise<ServerItem[]> {
  const { data, error } = await supabase
    .from('servidores')
    .select('*')
    .order('creado_at', { ascending: true })
    .returns<ServidorRow[]>()

  if (error) throw error
  return (data ?? []).map(mapServidorToServerItem)
}

async function obtenerServidor(id: string): Promise<ServerItem | null> {
  const { data, error } = await supabase
    .from('servidores')
    .select('*')
    .eq('id', id)
    .maybeSingle<ServidorRow>()

  if (error) throw error
  return data ? mapServidorToServerItem(data) : null
}

interface ServidoresRealtimeHandlers {
  onServidorNuevoOActualizado: (servidor: ServerItem) => void
  onServidorRemovido: (servidorId: string) => void
}

export function suscribirseAServidores(
  usuarioId: string,
  { onServidorNuevoOActualizado, onServidorRemovido }: ServidoresRealtimeHandlers
) {
  const channel = supabase
    .channel(`servidores-usuario-${usuarioId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'miembros_servidor',
        filter: `usuario_id=eq.${usuarioId}`,
      },
      async (payload) => {
        const servidorId = (payload.new as { servidor_id: string }).servidor_id
        const servidor = await obtenerServidor(servidorId)
        if (servidor) onServidorNuevoOActualizado(servidor)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'miembros_servidor',
        filter: `usuario_id=eq.${usuarioId}`,
      },
      (payload) => {
        const servidorId = (payload.old as { servidor_id: string }).servidor_id
        onServidorRemovido(servidorId)
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'servidores' },
      (payload) => {
        onServidorNuevoOActualizado(
          mapServidorToServerItem(payload.new as ServidorRow)
        )
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'servidores' },
      (payload) => {
        const servidorId = (payload.old as { id: string }).id
        onServidorRemovido(servidorId)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function actualizarServidor(
  servidorId: string,
  cambios: {
    nombre?: string
    iconoUrl?: string
    bannerUrl?: string | null
    welcomeChannelId?: string | null
    rulesChannelId?: string | null
    verificationLevel?: ServerVerificationLevel
    historyRetention?: ServerHistoryRetention
    defaultNotifications?: ServerDefaultNotifications
  }
): Promise<ServerItem> {
  const patch: Record<string, unknown> = {}
  if (cambios.nombre !== undefined) patch.nombre = cambios.nombre.trim()
  if (cambios.iconoUrl !== undefined) patch.icono_url = cambios.iconoUrl
  if (cambios.bannerUrl !== undefined) patch.banner_url = cambios.bannerUrl
  if (cambios.welcomeChannelId !== undefined) patch.canal_bienvenida_id = cambios.welcomeChannelId
  if (cambios.rulesChannelId !== undefined) patch.canal_normas_id = cambios.rulesChannelId
  if (cambios.verificationLevel !== undefined) patch.nivel_verificacion = cambios.verificationLevel
  if (cambios.historyRetention !== undefined) patch.retencion_historial = cambios.historyRetention
  if (cambios.defaultNotifications !== undefined)
    patch.notificaciones_por_defecto = cambios.defaultNotifications

  const { data, error } = await supabase
    .from('servidores')
    .update(patch)
    .eq('id', servidorId)
    .select('*')
    .single<ServidorRow>()

  if (error) throw error
  return mapServidorToServerItem(data)
}

export async function crearServidor(
  nombre: string,
  iconoUrl?: string,
  plantillaId?: string
): Promise<ServerItem> {
  const { data, error } = await supabase
    .rpc('crear_servidor_con_plantilla', {
      nombre_servidor: nombre,
      icono_url: iconoUrl ?? null,
      plantilla_id: plantillaId ?? null,
    })
    .single<ServidorRow>()

  if (error) throw error
  if (!data) throw new Error('No se pudo crear el servidor.')

  return mapServidorToServerItem(data)
}

export interface InvitePreview {
  serverId: string
  name: string
  iconUrl?: string
  memberCount: number
  alreadyMember: boolean
}

interface PrevisualizarInvitacionRow {
  servidor_id: string
  nombre: string
  icono_url: string | null
  cantidad_miembros: number
  ya_soy_miembro: boolean
}

export async function previsualizarInvitacion(
  codigoInvitacion: string
): Promise<InvitePreview | null> {
  const { data, error } = await supabase
    .rpc('previsualizar_invitacion', { p_codigo_invitacion: codigoInvitacion })
    .maybeSingle<PrevisualizarInvitacionRow>()

  if (error) throw error
  if (!data) return null

  return {
    serverId: data.servidor_id,
    name: data.nombre,
    iconUrl: data.icono_url ?? undefined,
    memberCount: data.cantidad_miembros,
    alreadyMember: data.ya_soy_miembro,
  }
}

export async function unirseAServidor(codigoInvitacion: string): Promise<ServerItem> {
  const { data, error } = await supabase
    .rpc('unirse_a_servidor', { p_codigo_invitacion: codigoInvitacion })
    .single<ServidorRow>()

  if (error) throw error
  if (!data) throw new Error('No se pudo unir al servidor.')

  return mapServidorToServerItem(data)
}

export async function regenerarInvitacion(servidorId: string): Promise<ServerItem> {
  const { data, error } = await supabase
    .rpc('regenerar_invitacion', { p_servidor_id: servidorId })
    .single<ServidorRow>()

  if (error) throw error
  if (!data) throw new Error('No se pudo regenerar la invitación.')

  return mapServidorToServerItem(data)
}

export async function transferirTitularidad(
  servidorId: string,
  nuevoPropietarioId: string
): Promise<ServerItem> {
  const { data, error } = await supabase
    .rpc('transferir_titularidad_servidor', {
      p_servidor_id: servidorId,
      p_nuevo_propietario_id: nuevoPropietarioId,
    })
    .single<ServidorRow>()

  if (error) throw error
  if (!data) throw new Error('No se pudo transferir la titularidad.')

  return mapServidorToServerItem(data)
}

export async function eliminarServidor(servidorId: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_servidor', { p_servidor_id: servidorId })
  if (error) throw error
}

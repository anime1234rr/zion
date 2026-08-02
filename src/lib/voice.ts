import { supabase } from '@/lib/supabase'
import { mapPerfilToChatUser, type PerfilRow } from '@/lib/profiles'
import type { ChatUser } from '@/lib/types'

const HEARTBEAT_INTERVAL_MS = 25_000
const STALE_MS = HEARTBEAT_INTERVAL_MS * 2.5

export interface VoiceParticipant {
  user: ChatUser
  canalId: string
  muted: boolean
  deafened: boolean
  cameraOn: boolean
  sharingScreen: boolean
  connectedAt: string
  updatedAt: string
}

interface EstadoVozRow {
  id: string
  canal_id: string
  usuario_id: string
  silenciado: boolean
  ensordecido: boolean
  camara_activa: boolean
  compartiendo_pantalla: boolean
  conectado_at: string
  actualizado_at: string
  perfiles: PerfilRow | null
}

const ESTADO_VOZ_SELECT = '*, perfiles!estados_voz_usuario_id_fkey(*)'

function mapEstadoVoz(row: EstadoVozRow): VoiceParticipant {
  const user = row.perfiles
    ? mapPerfilToChatUser(row.perfiles)
    : { id: row.usuario_id, name: 'Usuario', status: 'offline' as const }

  return {
    user,
    canalId: row.canal_id,
    muted: row.silenciado,
    deafened: row.ensordecido,
    cameraOn: row.camara_activa,
    sharingScreen: row.compartiendo_pantalla,
    connectedAt: row.conectado_at,
    updatedAt: row.actualizado_at,
  }
}

function esConexionViva(actualizadoAt: string): boolean {
  return Date.now() - new Date(actualizadoAt).getTime() < STALE_MS
}

export async function unirseAVoz(canalId: string): Promise<VoiceParticipant> {
  const { data, error } = await supabase
    .rpc('unirse_a_voz', { p_canal_id: canalId })
    .select(ESTADO_VOZ_SELECT)
    .single<EstadoVozRow>()

  if (error) throw error
  if (!data) throw new Error('No se pudo conectar al canal de voz.')
  return mapEstadoVoz(data)
}

export async function salirDeVoz(): Promise<void> {
  const { error } = await supabase.rpc('salir_de_voz')
  if (error) throw error
}

export async function actualizarEstadoVoz(cambios: {
  muted?: boolean
  deafened?: boolean
  cameraOn?: boolean
  sharingScreen?: boolean
}): Promise<void> {
  const { error } = await supabase.rpc('actualizar_estado_voz', {
    p_silenciado: cambios.muted ?? null,
    p_ensordecido: cambios.deafened ?? null,
    p_camara_activa: cambios.cameraOn ?? null,
    p_compartiendo_pantalla: cambios.sharingScreen ?? null,
  })
  if (error) throw error
}

export async function forzarSilencioVoz(usuarioObjetivoId: string, silenciado: boolean): Promise<void> {
  const { error } = await supabase.rpc('forzar_silencio_voz', {
    p_usuario_objetivo_id: usuarioObjetivoId,
    p_silenciado: silenciado,
  })
  if (error) throw error
}

export function iniciarHeartbeatVoz(): () => void {
  const interval = setInterval(() => {
    supabase.rpc('tocar_presencia_voz').then(({ error }) => {
      if (error) console.error('No se pudo refrescar la presencia de voz', error)
    })
  }, HEARTBEAT_INTERVAL_MS)

  return () => clearInterval(interval)
}

export async function listarParticipantesDeVoz(canalId: string): Promise<VoiceParticipant[]> {
  const { data, error } = await supabase
    .from('estados_voz')
    .select(ESTADO_VOZ_SELECT)
    .eq('canal_id', canalId)
    .returns<EstadoVozRow[]>()

  if (error) throw error
  return (data ?? []).map(mapEstadoVoz).filter((p) => esConexionViva(p.updatedAt))
}

export async function listarParticipantesDeVozDeCanales(canalIds: string[]): Promise<VoiceParticipant[]> {
  if (canalIds.length === 0) return []

  const { data, error } = await supabase
    .from('estados_voz')
    .select(ESTADO_VOZ_SELECT)
    .in('canal_id', canalIds)
    .returns<EstadoVozRow[]>()

  if (error) throw error
  return (data ?? []).map(mapEstadoVoz).filter((p) => esConexionViva(p.updatedAt))
}

export async function listarParticipantesDeVozDelServidor(servidorId: string): Promise<VoiceParticipant[]> {
  const { data, error } = await supabase
    .rpc('listar_participantes_de_voz_del_servidor', { p_servidor_id: servidorId })
    .select(ESTADO_VOZ_SELECT)

  if (error) throw error
  return ((data ?? []) as EstadoVozRow[]).map(mapEstadoVoz).filter((p) => esConexionViva(p.updatedAt))
}

interface SuscribirseAVozHandlers {
  onCambio: () => void
}

export function suscribirseAEstadosVoz(canalId: string, { onCambio }: SuscribirseAVozHandlers) {
  const channel = supabase
    .channel(`estados-voz-${canalId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'estados_voz', filter: `canal_id=eq.${canalId}` },
      () => onCambio()
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function suscribirseAEstadosVozGlobal(onCambio: () => void) {
  const channel = supabase
    .channel(`estados-voz-global-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'estados_voz' }, () => onCambio())
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

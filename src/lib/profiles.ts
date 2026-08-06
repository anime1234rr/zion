import { supabase } from '@/lib/supabase'
import type { ChatUser, UserStatus } from '@/lib/types'

export interface PerfilRow {
  id: string
  nombre_usuario: string
  nombre_completo: string | null
  avatar_url: string | null
  biografia: string | null
  estado: string
  color_banner: string
  banner_url: string | null
  fondo_url: string | null
  fondo_tipo: string | null
  creado_at: string
  actualizado_at: string
}

interface PreferenciasSeguridadRow {
  notificar_cambio_contrasena: boolean
  notificar_cambio_email: boolean
  notificar_metodo_login_vinculado: boolean
  notificar_metodo_login_eliminado: boolean
  notificar_mfa_agregado: boolean
  notificar_mfa_eliminado: boolean
}

export interface SecurityNotificationPrefs {
  cambioContrasena: boolean
  cambioEmail: boolean
  metodoLoginVinculado: boolean
  metodoLoginEliminado: boolean
  mfaAgregado: boolean
  mfaEliminado: boolean
}

function mapPreferenciasSeguridad(row: PreferenciasSeguridadRow): SecurityNotificationPrefs {
  return {
    cambioContrasena: row.notificar_cambio_contrasena,
    cambioEmail: row.notificar_cambio_email,
    metodoLoginVinculado: row.notificar_metodo_login_vinculado,
    metodoLoginEliminado: row.notificar_metodo_login_eliminado,
    mfaAgregado: row.notificar_mfa_agregado,
    mfaEliminado: row.notificar_mfa_eliminado,
  }
}

export async function obtenerPreferenciasNotificacionSeguridad(
  userId: string
): Promise<SecurityNotificationPrefs> {
  const { data, error } = await supabase
    .from('perfiles')
    .select(
      'notificar_cambio_contrasena, notificar_cambio_email, notificar_metodo_login_vinculado, notificar_metodo_login_eliminado, notificar_mfa_agregado, notificar_mfa_eliminado'
    )
    .eq('id', userId)
    .single<PreferenciasSeguridadRow>()

  if (error) throw error
  return mapPreferenciasSeguridad(data)
}

export async function actualizarPreferenciaNotificacionSeguridad(
  userId: string,
  clave: keyof SecurityNotificationPrefs,
  valor: boolean
): Promise<void> {
  const columnaPorClave: Record<keyof SecurityNotificationPrefs, string> = {
    cambioContrasena: 'notificar_cambio_contrasena',
    cambioEmail: 'notificar_cambio_email',
    metodoLoginVinculado: 'notificar_metodo_login_vinculado',
    metodoLoginEliminado: 'notificar_metodo_login_eliminado',
    mfaAgregado: 'notificar_mfa_agregado',
    mfaEliminado: 'notificar_mfa_eliminado',
  }

  const { error } = await supabase
    .from('perfiles')
    .update({ [columnaPorClave[clave]]: valor })
    .eq('id', userId)

  if (error) throw error
}

const estadoToUserStatus: Record<string, UserStatus> = {
  en_linea: 'online',
  ausente: 'idle',
  ocupado: 'dnd',
  desconectado_manual: 'offline',
  desconectado_cierre: 'offline',
}

const HEARTBEAT_STALE_MS = 45_000 * 2.5

function esPresenciaViva(actualizadoAt: string): boolean {
  return Date.now() - new Date(actualizadoAt).getTime() < HEARTBEAT_STALE_MS
}

const userStatusToEstado: Record<UserStatus, string> = {
  online: 'en_linea',
  idle: 'ausente',
  dnd: 'ocupado',
  offline: 'desconectado_manual',
}

export function mapPerfilToChatUser(row: PerfilRow): ChatUser {
  const status = estadoToUserStatus[row.estado] ?? 'offline'
  return {
    id: row.id,
    name: row.nombre_completo || row.nombre_usuario,
    avatarUrl: row.avatar_url ?? undefined,
    status: status !== 'offline' && !esPresenciaViva(row.actualizado_at) ? 'offline' : status,
    backgroundUrl: row.fondo_url ?? undefined,
    backgroundType: row.fondo_tipo === 'imagen' || row.fondo_tipo === 'video' ? row.fondo_tipo : undefined,
  }
}

export async function obtenerPerfil(userId: string): Promise<ChatUser> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single<PerfilRow>()

  if (error) throw error
  return mapPerfilToChatUser(data)
}

export async function actualizarAvatar(userId: string, avatarUrl: string) {
  const { error } = await supabase
    .from('perfiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)

  if (error) throw error
}

export async function actualizarBanner(userId: string, bannerUrl: string | null) {
  const { error } = await supabase
    .from('perfiles')
    .update({ banner_url: bannerUrl })
    .eq('id', userId)

  if (error) throw error
}

export interface EditableProfile {
  id: string
  nombreUsuario: string
  nombreCompleto: string
  biografia: string
  status: UserStatus
  avatarUrl?: string
  colorBanner: string
  bannerUrl?: string
}

function mapPerfilToEditableProfile(row: PerfilRow): EditableProfile {
  return {
    id: row.id,
    nombreUsuario: row.nombre_usuario,
    nombreCompleto: row.nombre_completo ?? '',
    biografia: row.biografia ?? '',
    status: estadoToUserStatus[row.estado] ?? 'offline',
    avatarUrl: row.avatar_url ?? undefined,
    colorBanner: row.color_banner,
    bannerUrl: row.banner_url ?? undefined,
  }
}

export async function obtenerPerfilEditable(userId: string): Promise<EditableProfile> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single<PerfilRow>()

  if (error) throw error
  return mapPerfilToEditableProfile(data)
}

export async function actualizarPerfil(
  userId: string,
  cambios: {
    nombreUsuario?: string
    nombreCompleto?: string
    biografia?: string
    status?: UserStatus
    colorBanner?: string
  }
): Promise<EditableProfile> {
  const patch: Record<string, unknown> = {}
  if (cambios.nombreUsuario !== undefined) patch.nombre_usuario = cambios.nombreUsuario.trim()
  if (cambios.nombreCompleto !== undefined) patch.nombre_completo = cambios.nombreCompleto.trim()
  if (cambios.biografia !== undefined) patch.biografia = cambios.biografia.trim()
  if (cambios.status !== undefined) patch.estado = userStatusToEstado[cambios.status]
  if (cambios.colorBanner !== undefined) patch.color_banner = cambios.colorBanner

  const { data, error } = await supabase
    .from('perfiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single<PerfilRow>()

  if (error) throw error
  return mapPerfilToEditableProfile(data)
}

export interface PublicProfile {
  id: string
  nombreUsuario: string
  nombreCompleto: string
  biografia: string
  status: UserStatus
  avatarUrl?: string
  colorBanner: string
  bannerUrl?: string
  creadoAt: string
}

function mapPerfilToPublicProfile(row: PerfilRow): PublicProfile {
  const status = estadoToUserStatus[row.estado] ?? 'offline'
  return {
    id: row.id,
    nombreUsuario: row.nombre_usuario,
    nombreCompleto: row.nombre_completo ?? '',
    biografia: row.biografia ?? '',
    status: status !== 'offline' && !esPresenciaViva(row.actualizado_at) ? 'offline' : status,
    avatarUrl: row.avatar_url ?? undefined,
    colorBanner: row.color_banner,
    bannerUrl: row.banner_url ?? undefined,
    creadoAt: row.creado_at,
  }
}

export async function obtenerPerfilPublico(userId: string): Promise<PublicProfile> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single<PerfilRow>()

  if (error) throw error
  return mapPerfilToPublicProfile(data)
}

export interface AppBackground {
  url: string
  tipo: 'imagen' | 'video'
}

export async function obtenerFondoApp(userId: string): Promise<AppBackground | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('fondo_url, fondo_tipo')
    .eq('id', userId)
    .single<{ fondo_url: string | null; fondo_tipo: string | null }>()

  if (error) throw error
  if (!data.fondo_url || (data.fondo_tipo !== 'imagen' && data.fondo_tipo !== 'video')) return null
  return { url: data.fondo_url, tipo: data.fondo_tipo }
}

export async function actualizarFondoApp(
  userId: string,
  fondo: AppBackground | null
): Promise<void> {
  const { error } = await supabase
    .from('perfiles')
    .update({ fondo_url: fondo?.url ?? null, fondo_tipo: fondo?.tipo ?? null })
    .eq('id', userId)

  if (error) throw error
}

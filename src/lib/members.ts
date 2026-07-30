import { supabase } from '@/lib/supabase'
import { mapPerfilToChatUser, type PerfilRow } from '@/lib/profiles'
import type { ChatUser } from '@/lib/types'

export interface ServerRole {
  id: string
  nombre: string
  color: string | null
  esRolBase: boolean
  permisos: Record<string, boolean>
}

export interface ServerMember {
  membershipId: string
  user: ChatUser
  role: ServerRole | null
  joinedAt: string
}

export function suscribirseAMiembrosDeServidor(
  servidorId: string,
  onCambio: () => void
) {
  const channel = supabase
    .channel(`miembros-servidor-${servidorId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'miembros_servidor',
        filter: `servidor_id=eq.${servidorId}`,
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

export function suscribirseARolesDeServidor(
  servidorId: string,
  onCambio: () => void
) {
  const channel = supabase
    .channel(`roles-servidor-${servidorId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'roles_servidor',
        filter: `servidor_id=eq.${servidorId}`,
      },
      () => onCambio()
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

interface RolRow {
  id: string
  nombre: string
  color: string | null
  es_rol_base: boolean
  permisos: Record<string, boolean>
}

interface MiembroRow {
  id: string
  usuario_id: string
  unido_at: string
  perfiles: PerfilRow | null
  roles_servidor: RolRow | null
}

function mapRol(row: RolRow): ServerRole {
  return {
    id: row.id,
    nombre: row.nombre,
    color: row.color,
    esRolBase: row.es_rol_base,
    permisos: row.permisos ?? {},
  }
}

export async function listarRolesDeServidor(
  servidorId: string
): Promise<ServerRole[]> {
  const { data, error } = await supabase
    .from('roles_servidor')
    .select('*')
    .eq('servidor_id', servidorId)
    .order('creado_at', { ascending: true })
    .returns<RolRow[]>()

  if (error) throw error
  return (data ?? []).map(mapRol)
}

export async function listarMiembros(servidorId: string): Promise<ServerMember[]> {
  const { data, error } = await supabase
    .from('miembros_servidor')
    .select('id, usuario_id, unido_at, perfiles(*), roles_servidor(*)')
    .eq('servidor_id', servidorId)
    .order('unido_at', { ascending: true })
    .returns<MiembroRow[]>()

  if (error) throw error
  return (data ?? []).map((row) => ({
    membershipId: row.id,
    user: row.perfiles
      ? mapPerfilToChatUser(row.perfiles)
      : { id: row.usuario_id, name: 'Usuario', status: 'offline' as const },
    role: row.roles_servidor ? mapRol(row.roles_servidor) : null,
    joinedAt: row.unido_at,
  }))
}

export async function obtenerMembresiaDeUsuario(
  servidorId: string,
  usuarioId: string
): Promise<{ role: ServerRole | null; joinedAt: string } | null> {
  const { data, error } = await supabase
    .from('miembros_servidor')
    .select('unido_at, roles_servidor(*)')
    .eq('servidor_id', servidorId)
    .eq('usuario_id', usuarioId)
    .maybeSingle<{ unido_at: string; roles_servidor: RolRow | null }>()

  if (error) throw error
  if (!data) return null
  return {
    role: data.roles_servidor ? mapRol(data.roles_servidor) : null,
    joinedAt: data.unido_at,
  }
}

export async function actualizarRolDeMiembro(
  membershipId: string,
  rolId: string
): Promise<void> {
  const { error } = await supabase.rpc('actualizar_rol_miembro', {
    p_miembro_id: membershipId,
    p_nuevo_rol_id: rolId,
  })

  if (error) throw error
}

export async function expulsarMiembro(membershipId: string): Promise<void> {
  const { error } = await supabase.rpc('expulsar_miembro', {
    p_miembro_id: membershipId,
  })

  if (error) throw error
}

export const CATEGORIAS_PERMISOS = [
  { id: 'servidor', label: 'Gestión del servidor', icon: '🛡️' },
  { id: 'canales', label: 'Canales y estructura', icon: '🛠️' },
  { id: 'miembros', label: 'Miembros y roles', icon: '👥' },
  { id: 'mensajes', label: 'Mensajes', icon: '💬' },
  { id: 'voz', label: 'Voz', icon: '🎙️' },
] as const

export const PERMISOS_CONOCIDOS = [
  {
    key: 'admin',
    label: 'Administrador del servidor (todos los permisos)',
    categoria: 'servidor',
    enforced: true,
  },
  {
    key: 'gestionar_servidor',
    label: 'Editar nombre e ícono del servidor',
    categoria: 'servidor',
    enforced: true,
  },
  {
    key: 'gestionar_invitaciones',
    label: 'Crear y revocar invitaciones',
    categoria: 'servidor',
    enforced: false,
  },
  {
    key: 'ver_registros',
    label: 'Ver registro de auditoría',
    categoria: 'servidor',
    enforced: false,
  },
  {
    key: 'gestionar_webhooks',
    label: 'Configurar apps y webhooks',
    categoria: 'servidor',
    enforced: false,
  },
  {
    key: 'gestionar_canales',
    label: 'Crear canales',
    categoria: 'canales',
    enforced: true,
  },
  {
    key: 'gestionar_roles',
    label: 'Crear y asignar roles',
    categoria: 'miembros',
    enforced: true,
  },
  {
    key: 'expulsar_miembros',
    label: 'Expulsar miembros',
    categoria: 'miembros',
    enforced: true,
  },
  {
    key: 'banear_miembros',
    label: 'Banear miembros',
    categoria: 'miembros',
    enforced: false,
  },
  {
    key: 'gestionar_apodos',
    label: 'Cambiar apodos de otros miembros',
    categoria: 'miembros',
    enforced: false,
  },
  {
    key: 'silenciar_miembros',
    label: 'Silenciar miembros (timeout)',
    categoria: 'miembros',
    enforced: false,
  },
  {
    key: 'enviar_mensajes',
    label: 'Enviar mensajes',
    categoria: 'mensajes',
    enforced: false,
  },
  {
    key: 'borrar_mensajes_ajenos',
    label: 'Borrar mensajes de otros',
    categoria: 'mensajes',
    enforced: true,
  },
  {
    key: 'fijar_mensajes',
    label: 'Fijar y desfijar mensajes',
    categoria: 'mensajes',
    enforced: true,
  },
  {
    key: 'conectar_voz',
    label: 'Conectarse a canales de voz',
    categoria: 'voz',
    enforced: true,
  },
  {
    key: 'transmitir_voz',
    label: 'Hablar en canales de voz',
    categoria: 'voz',
    enforced: false,
  },
] as const

export async function crearRol(
  servidorId: string,
  nombre: string,
  color: string,
  permisos: Record<string, boolean>
): Promise<ServerRole> {
  const { data, error } = await supabase
    .from('roles_servidor')
    .insert({
      servidor_id: servidorId,
      nombre: nombre.trim(),
      color,
      permisos,
    })
    .select('*')
    .single<RolRow>()

  if (error) throw error
  return mapRol(data)
}

export async function actualizarRol(
  rolId: string,
  cambios: { nombre?: string; color?: string; permisos?: Record<string, boolean> }
): Promise<ServerRole> {
  const patch: Record<string, unknown> = {}
  if (cambios.nombre !== undefined) patch.nombre = cambios.nombre.trim()
  if (cambios.color !== undefined) patch.color = cambios.color
  if (cambios.permisos !== undefined) patch.permisos = cambios.permisos

  const { data, error } = await supabase
    .from('roles_servidor')
    .update(patch)
    .eq('id', rolId)
    .select('*')
    .single<RolRow>()

  if (error) throw error
  return mapRol(data)
}

export async function eliminarRol(rolId: string): Promise<void> {
  const { error } = await supabase.from('roles_servidor').delete().eq('id', rolId)
  if (error) throw error
}

import { FunctionsHttpError } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

export interface AppToken {
  id: string
  servidorId: string
  rolId: string
  rolNombre: string
  rolColor: string | null
  nombre: string
  creadoAt: string
  ultimoUsoAt: string | null
  revocado: boolean
  usuarioBotId: string | null
  avatarUrl: string | null
}

interface AppTokenRow {
  id: string
  servidor_id: string
  rol_id: string
  nombre: string
  creado_at: string
  ultimo_uso_at: string | null
  revocado: boolean
  usuario_bot_id: string | null
  roles_servidor: { nombre: string; color: string | null } | { nombre: string; color: string | null }[] | null
  perfiles: { avatar_url: string | null } | { avatar_url: string | null }[] | null
}

function mapAppTokenRow(row: AppTokenRow): AppToken {
  const rol = Array.isArray(row.roles_servidor) ? row.roles_servidor[0] : row.roles_servidor
  const perfil = Array.isArray(row.perfiles) ? row.perfiles[0] : row.perfiles
  return {
    id: row.id,
    servidorId: row.servidor_id,
    rolId: row.rol_id,
    rolNombre: rol?.nombre ?? 'Rol eliminado',
    rolColor: rol?.color ?? null,
    nombre: row.nombre,
    creadoAt: row.creado_at,
    ultimoUsoAt: row.ultimo_uso_at,
    revocado: row.revocado,
    usuarioBotId: row.usuario_bot_id,
    avatarUrl: perfil?.avatar_url ?? null,
  }
}

export async function listarTokensDeApps(servidorId: string): Promise<AppToken[]> {
  const { data, error } = await supabase
    .from('tokens_apps')
    .select(
      'id, servidor_id, rol_id, nombre, creado_at, ultimo_uso_at, revocado, usuario_bot_id, roles_servidor(nombre, color), perfiles(avatar_url)'
    )
    .eq('servidor_id', servidorId)
    .order('creado_at', { ascending: true })
    .returns<AppTokenRow[]>()

  if (error) throw error
  return (data ?? []).map(mapAppTokenRow)
}

export async function crearTokenApp(
  servidorId: string,
  rolId: string,
  nombre: string
): Promise<{ app: AppToken; token: string }> {
  const { data, error } = await supabase.functions.invoke<{
    id: string
    nombre: string
    rolId: string
    creadoAt: string
    token: string
    usuarioBotId: string | null
  }>('tokens', {
    body: {
      action: 'create_app_token',
      servidorId,
      rolId,
      nombre: nombre.trim(),
    },
  })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null)
      throw new Error(body?.error ?? error.message)
    }
    throw error
  }
  if (!data) throw new Error('No se pudo crear el token')

  return {
    token: data.token,
    app: {
      id: data.id,
      servidorId,
      rolId: data.rolId,
      rolNombre: '',
      rolColor: null,
      nombre: data.nombre,
      creadoAt: data.creadoAt,
      ultimoUsoAt: null,
      revocado: false,
      usuarioBotId: data.usuarioBotId,
      avatarUrl: null,
    },
  }
}

export async function revocarTokenApp(tokenId: string): Promise<void> {
  const { error } = await supabase.rpc('revocar_token_app', { p_token_id: tokenId })
  if (error) throw error
}

export async function actualizarPerfilApp(
  tokenId: string,
  nombre: string,
  avatarUrl: string | null
): Promise<void> {
  const { error } = await supabase.rpc('actualizar_perfil_app', {
    p_token_id: tokenId,
    p_nombre: nombre.trim(),
    p_avatar_url: avatarUrl,
  })
  if (error) throw error
}

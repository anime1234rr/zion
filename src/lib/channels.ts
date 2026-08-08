import { supabase } from '@/lib/supabase'
import { tipoCanalToChannelType } from '@/lib/servers'
import { listarRolesDeServidor } from '@/lib/members'
import type { ChannelCategory, ChannelItem, ChannelType } from '@/lib/types'

interface CanalRow {
  id: string
  servidor_id: string
  nombre: string
  tipo: string
  posicion: number
  categoria_id: string | null
  es_privado: boolean
  creado_at: string
}

export function suscribirseACanalesDeServidor(
  servidorId: string,
  onCambio: () => void
) {
  const channel = supabase
    .channel(`canales-servidor-${servidorId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'canales_servidor',
        filter: `servidor_id=eq.${servidorId}`,
      },
      () => onCambio()
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export const UNCATEGORIZED_ID = '__sin_categoria__'

function mapCanalToChannelItem(row: CanalRow): ChannelItem {
  return {
    id: row.id,
    name: row.nombre,
    type: tipoCanalToChannelType[row.tipo] ?? 'text',
    categoryId: row.categoria_id,
  }
}

function agruparPorCategoria(rows: CanalRow[]): ChannelCategory[] {
  const categorias = rows
    .filter((row) => row.tipo === 'categoria')
    .sort((a, b) => a.posicion - b.posicion)

  const canales = rows
    .filter((row) => row.tipo !== 'categoria')
    .sort((a, b) => a.posicion - b.posicion)

  const sinCategoria = canales.filter((row) => row.categoria_id === null)

  const resultado: ChannelCategory[] = [
    {
      id: UNCATEGORIZED_ID,
      name: '',
      channels: sinCategoria.map(mapCanalToChannelItem),
    },
  ]

  for (const categoria of categorias) {
    resultado.push({
      id: categoria.id,
      name: categoria.nombre,
      channels: canales
        .filter((row) => row.categoria_id === categoria.id)
        .map(mapCanalToChannelItem),
    })
  }

  return resultado
}

export async function listarCanales(
  servidorId: string
): Promise<ChannelCategory[]> {
  const { data, error } = await supabase
    .from('canales_servidor')
    .select('*')
    .eq('servidor_id', servidorId)
    .neq('tipo', 'hilo_foro')
    .order('posicion', { ascending: true })
    .order('creado_at', { ascending: true })
    .returns<CanalRow[]>()

  if (error) throw error
  return agruparPorCategoria(data ?? [])
}

const PERMISOS_PRINCIPALES_CATEGORIA: Record<string, boolean> = {
  ver_canal: true,
  enviar_mensajes: true,
  enviar_archivos: true,
  anadir_reacciones: true,
  usar_enlaces_externos: true,
  conectar_canal_voz: true,
  hablar_voz: true,
}

export async function crearCategoria(
  servidorId: string,
  nombre: string
): Promise<ChannelCategory> {
  const { data, error } = await supabase
    .rpc('crear_canal', {
      p_servidor_id: servidorId,
      p_nombre: nombre,
      p_tipo: 'categoria',
    })
    .single<CanalRow>()

  if (error) throw error
  if (!data) throw new Error('No se pudo crear la categoría.')

  try {
    const roles = await listarRolesDeServidor(servidorId)
    const rolBase = roles.find((r) => r.esRolBase)
    if (rolBase) {
      await actualizarPermisosDeCanal(data.id, rolBase.id, PERMISOS_PRINCIPALES_CATEGORIA)
    }
  } catch (err) {
    console.error('No se pudieron aplicar los permisos principales a la categoría', err)
  }

  return { id: data.id, name: data.nombre, channels: [] }
}

export interface ReordenCanal {
  canalId: string
  categoriaId: string | null
  posicion: number
}

export async function reordenarCanales(
  servidorId: string,
  cambios: ReordenCanal[]
): Promise<void> {
  const { error } = await supabase.rpc('reordenar_canales', {
    p_servidor_id: servidorId,
    p_cambios: cambios.map((c) => ({
      canal_id: c.canalId,
      categoria_id: c.categoriaId,
      posicion: c.posicion,
    })),
  })

  if (error) throw error
}

const channelTypeToTipoCanal: Record<ChannelType, string> = {
  text: 'texto',
  voice: 'voz',
  code: 'codigo',
  announcement: 'anuncios',
  forum: 'foro',
}

export async function crearCanal(
  servidorId: string,
  nombre: string,
  tipo: ChannelType
): Promise<ChannelItem> {
  const { data, error } = await supabase
    .rpc('crear_canal', {
      p_servidor_id: servidorId,
      p_nombre: nombre,
      p_tipo: channelTypeToTipoCanal[tipo],
    })
    .single<CanalRow>()

  if (error) throw error
  if (!data) throw new Error('No se pudo crear el canal.')

  return mapCanalToChannelItem(data)
}

export async function crearCanalEnCategoria(
  servidorId: string,
  nombre: string,
  tipo: ChannelType,
  categoriaId: string,
  posicion: number
): Promise<ChannelItem> {
  const nuevo = await crearCanal(servidorId, nombre, tipo)
  await reordenarCanales(servidorId, [{ canalId: nuevo.id, categoriaId, posicion }])
  return { ...nuevo, categoryId: categoriaId }
}

export async function actualizarCanal(
  servidorId: string,
  canalId: string,
  cambios: { nombre?: string; tipo?: ChannelType; categoriaId?: string | null; esPrivado?: boolean }
): Promise<ChannelItem> {
  const { data, error } = await supabase
    .rpc('gestionar_canal_servidor', {
      p_accion: 'actualizar',
      p_servidor_id: servidorId,
      p_canal_id: canalId,
      p_nombre: cambios.nombre,
      p_tipo: cambios.tipo ? channelTypeToTipoCanal[cambios.tipo] : undefined,
      p_categoria_id: cambios.categoriaId,
      p_es_privado: cambios.esPrivado,
    })
    .single<CanalRow>()

  if (error) throw error
  if (!data) throw new Error('No se pudo actualizar el canal.')

  return mapCanalToChannelItem(data)
}

export async function eliminarCanal(servidorId: string, canalId: string): Promise<void> {
  const { error } = await supabase.rpc('gestionar_canal_servidor', {
    p_accion: 'eliminar',
    p_servidor_id: servidorId,
    p_canal_id: canalId,
  })

  if (error) throw error
}

export async function eliminarCategoria(
  servidorId: string,
  categoria: ChannelCategory
): Promise<void> {
  const overridesCategoria = await listarPermisosDeCanal(categoria.id)

  for (const canal of categoria.channels) {
    const overridesCanal = await listarPermisosDeCanal(canal.id)
    const rolesConPropios = new Set(overridesCanal.map((o) => o.rolId))
    for (const heredado of overridesCategoria) {
      if (rolesConPropios.has(heredado.rolId)) continue
      await actualizarPermisosDeCanal(canal.id, heredado.rolId, heredado.permisos)
    }
  }

  if (categoria.channels.length > 0) {
    await reordenarCanales(
      servidorId,
      categoria.channels.map((canal, index) => ({
        canalId: canal.id,
        categoriaId: null,
        posicion: index,
      }))
    )
  }

  await eliminarCanal(servidorId, categoria.id)
}

const CANALES_DE_TEXTO: ChannelType[] = ['text', 'code', 'announcement', 'forum']
const CANALES_DE_VOZ: ChannelType[] = ['voice']
const TODOS_LOS_CANALES: ChannelType[] = ['text', 'code', 'announcement', 'voice', 'forum']

export const PERMISOS_CANAL_CONOCIDOS = [
  { key: 'ver_canal', label: 'Visualizar el canal en la lista', enforced: true, tipos: TODOS_LOS_CANALES },
  { key: 'enviar_mensajes', label: 'Escribir mensajes de texto', enforced: true, tipos: CANALES_DE_TEXTO },
  { key: 'enviar_archivos', label: 'Subir imágenes o archivos adjuntos', enforced: true, tipos: CANALES_DE_TEXTO },
  { key: 'anadir_reacciones', label: 'Reaccionar a mensajes con emojis', enforced: true, tipos: CANALES_DE_TEXTO },
  { key: 'mencionar_todos', label: 'Usar etiquetas globales (@everyone / @here)', enforced: true, tipos: CANALES_DE_TEXTO },
  { key: 'usar_enlaces_externos', label: 'Enviar hipervínculos web', enforced: true, tipos: CANALES_DE_TEXTO },
  { key: 'leer_historial_mensajes', label: 'Consultar mensajes previos', enforced: true, tipos: CANALES_DE_TEXTO },
  { key: 'usar_comandos_apps', label: 'Interactuar con bots o utilidades integradas', enforced: false, tipos: CANALES_DE_TEXTO },
  { key: 'conectar_canal_voz', label: 'Entrar a salas de comunicación por voz', enforced: true, tipos: CANALES_DE_VOZ },
  { key: 'hablar_voz', label: 'Emitir audio en canales de voz', enforced: true, tipos: CANALES_DE_VOZ },
  { key: 'transmitir_video_pantalla', label: 'Compartir pantalla o cámara web', enforced: true, tipos: CANALES_DE_VOZ },
  { key: 'silenciar_miembros_voz', label: 'Silenciar a otros usuarios en voz', enforced: true, tipos: CANALES_DE_VOZ },
] as const

export interface ChannelRolePermisos {
  id: string
  canalId: string
  rolId: string
  permisos: Record<string, boolean>
}

interface PermisoCanalRolRow {
  id: string
  canal_id: string
  rol_id: string
  permisos: Record<string, boolean>
}

export async function listarPermisosDeCanal(canalId: string): Promise<ChannelRolePermisos[]> {
  const { data, error } = await supabase
    .from('permisos_canal_rol')
    .select('*')
    .eq('canal_id', canalId)
    .returns<PermisoCanalRolRow[]>()

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    canalId: row.canal_id,
    rolId: row.rol_id,
    permisos: row.permisos ?? {},
  }))
}

export async function listarPermisosDeRolEnCanales(rolId: string): Promise<ChannelRolePermisos[]> {
  const { data, error } = await supabase
    .from('permisos_canal_rol')
    .select('*')
    .eq('rol_id', rolId)
    .returns<PermisoCanalRolRow[]>()

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    canalId: row.canal_id,
    rolId: row.rol_id,
    permisos: row.permisos ?? {},
  }))
}

export async function actualizarPermisosDeCanal(
  canalId: string,
  rolId: string,
  permisos: Record<string, boolean>
): Promise<ChannelRolePermisos> {
  const { data, error } = await supabase
    .from('permisos_canal_rol')
    .upsert({ canal_id: canalId, rol_id: rolId, permisos }, { onConflict: 'canal_id,rol_id' })
    .select('*')
    .single<PermisoCanalRolRow>()

  if (error) throw error
  return {
    id: data.id,
    canalId: data.canal_id,
    rolId: data.rol_id,
    permisos: data.permisos ?? {},
  }
}

export async function eliminarPermisosDeCanal(canalId: string, rolId: string): Promise<void> {
  const { error } = await supabase
    .from('permisos_canal_rol')
    .delete()
    .eq('canal_id', canalId)
    .eq('rol_id', rolId)

  if (error) throw error
}

import { supabase } from '@/lib/supabase'
import { eliminarCanal } from '@/lib/channels'
import type { ChatUser } from '@/lib/types'

export interface ForumTag {
  id: string
  name: string
  color: string
}

export interface ForumThread {
  id: string
  title: string
  pinned: boolean
  locked: boolean
  createdAt: string
  author: ChatUser
  body: string
  messageCount: number
  lastActivityAt: string
  tags: ForumTag[]
}

interface HiloForoRow {
  id: string
  titulo: string
  fijado: boolean
  bloqueado: boolean
  creado_at: string
  autor_id: string | null
  autor_nombre: string
  autor_avatar_url: string | null
  cuerpo: string | null
  cantidad_mensajes: number
  ultima_actividad: string
  etiquetas: { id: string; nombre: string; color: string }[] | null
}

function mapHiloForoRow(row: HiloForoRow): ForumThread {
  return {
    id: row.id,
    title: row.titulo,
    pinned: row.fijado,
    locked: row.bloqueado,
    createdAt: row.creado_at,
    author: {
      id: row.autor_id ?? '',
      name: row.autor_nombre,
      avatarUrl: row.autor_avatar_url ?? undefined,
      status: 'offline',
    },
    body: row.cuerpo ?? '',
    messageCount: row.cantidad_mensajes,
    lastActivityAt: row.ultima_actividad,
    tags: (row.etiquetas ?? []).map((t) => ({ id: t.id, name: t.nombre, color: t.color })),
  }
}

export async function listarHilosDeForo(canalForoId: string): Promise<ForumThread[]> {
  const { data, error } = await supabase.rpc('listar_hilos_foro', { p_canal_foro_id: canalForoId })

  if (error) throw error
  return ((data ?? []) as HiloForoRow[]).map(mapHiloForoRow)
}

export async function crearHiloForo(
  canalForoId: string,
  titulo: string,
  cuerpo: string,
  etiquetaIds: string[]
): Promise<string> {
  const { data, error } = await supabase.rpc('crear_hilo_foro', {
    p_canal_foro_id: canalForoId,
    p_titulo: titulo.trim(),
    p_cuerpo: cuerpo,
    p_etiquetas: etiquetaIds,
  })

  if (error) throw error
  return data as string
}

export async function eliminarHiloForo(servidorId: string, hiloId: string): Promise<void> {
  await eliminarCanal(servidorId, hiloId)
}

export async function fijarHiloForo(hiloId: string, fijado: boolean): Promise<void> {
  const { error } = await supabase.rpc('fijar_hilo_foro', { p_hilo_id: hiloId, p_fijado: fijado })
  if (error) throw error
}

export async function bloquearHiloForo(hiloId: string, bloqueado: boolean): Promise<void> {
  const { error } = await supabase.rpc('bloquear_hilo_foro', {
    p_hilo_id: hiloId,
    p_bloqueado: bloqueado,
  })
  if (error) throw error
}

export async function actualizarEtiquetasDeHilo(
  hiloId: string,
  etiquetaIds: string[]
): Promise<void> {
  const { error } = await supabase.rpc('actualizar_etiquetas_hilo', {
    p_hilo_id: hiloId,
    p_etiquetas: etiquetaIds,
  })
  if (error) throw error
}

interface EtiquetaForoRow {
  id: string
  canal_id: string
  nombre: string
  color: string
}

function mapEtiquetaForoRow(row: EtiquetaForoRow): ForumTag {
  return { id: row.id, name: row.nombre, color: row.color }
}

export async function listarEtiquetasDeForo(canalId: string): Promise<ForumTag[]> {
  const { data, error } = await supabase
    .from('etiquetas_foro')
    .select('*')
    .eq('canal_id', canalId)
    .order('creado_at', { ascending: true })
    .returns<EtiquetaForoRow[]>()

  if (error) throw error
  return (data ?? []).map(mapEtiquetaForoRow)
}

export async function crearEtiquetaForo(
  canalId: string,
  nombre: string,
  color: string
): Promise<ForumTag> {
  const { data, error } = await supabase
    .rpc('crear_etiqueta_foro', { p_canal_id: canalId, p_nombre: nombre.trim(), p_color: color })
    .single<EtiquetaForoRow>()

  if (error) throw error
  return mapEtiquetaForoRow(data)
}

export async function actualizarEtiquetaForo(
  etiquetaId: string,
  nombre: string,
  color: string
): Promise<ForumTag> {
  const { data, error } = await supabase
    .rpc('actualizar_etiqueta_foro', {
      p_etiqueta_id: etiquetaId,
      p_nombre: nombre.trim(),
      p_color: color,
    })
    .single<EtiquetaForoRow>()

  if (error) throw error
  return mapEtiquetaForoRow(data)
}

export async function eliminarEtiquetaForo(etiquetaId: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_etiqueta_foro', { p_etiqueta_id: etiquetaId })
  if (error) throw error
}

export function suscribirseAHilosDeForo(canalForoId: string, onCambio: () => void) {
  const channel = supabase
    .channel(`hilos-foro-${canalForoId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'canales_servidor',
        filter: `hilo_padre_id=eq.${canalForoId}`,
      },
      () => onCambio()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hilo_etiquetas' },
      () => onCambio()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mensajes' },
      () => onCambio()
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

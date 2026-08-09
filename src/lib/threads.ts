import { supabase } from '@/lib/supabase'
import { eliminarCanal } from '@/lib/channels'
import type { ChatUser } from '@/lib/types'

export interface ChannelThread {
  id: string
  nombre: string
  pinned: boolean
  locked: boolean
  createdAt: string
  author: ChatUser
  originMessageId: string | null
  messageCount: number
  lastActivityAt: string
}

interface HiloCanalRow {
  id: string
  nombre: string
  fijado: boolean
  bloqueado: boolean
  creado_at: string
  autor_id: string | null
  autor_nombre: string
  autor_avatar_url: string | null
  mensaje_origen_id: string | null
  cantidad_mensajes: number
  ultima_actividad: string
}

function mapHiloCanalRow(row: HiloCanalRow): ChannelThread {
  return {
    id: row.id,
    nombre: row.nombre,
    pinned: row.fijado,
    locked: row.bloqueado,
    createdAt: row.creado_at,
    author: {
      id: row.autor_id ?? '',
      name: row.autor_nombre,
      avatarUrl: row.autor_avatar_url ?? undefined,
      status: 'offline',
    },
    originMessageId: row.mensaje_origen_id,
    messageCount: row.cantidad_mensajes,
    lastActivityAt: row.ultima_actividad,
  }
}

export async function listarHilosDeCanal(canalId: string): Promise<ChannelThread[]> {
  const { data, error } = await supabase.rpc('listar_hilos_canal', { p_canal_id: canalId })
  if (error) throw error
  return ((data ?? []) as HiloCanalRow[]).map(mapHiloCanalRow)
}

export async function crearHiloDeCanal(
  canalId: string,
  nombre: string,
  mensajeOrigenId?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('crear_hilo_canal', {
    p_canal_id: canalId,
    p_nombre: nombre.trim(),
    p_mensaje_origen_id: mensajeOrigenId ?? null,
  })
  if (error) throw error
  return data as string
}

export async function eliminarHiloDeCanal(servidorId: string, hiloId: string): Promise<void> {
  await eliminarCanal(servidorId, hiloId)
}

export async function fijarHiloDeCanal(hiloId: string, fijado: boolean): Promise<void> {
  const { error } = await supabase.rpc('fijar_hilo_foro', { p_hilo_id: hiloId, p_fijado: fijado })
  if (error) throw error
}

export async function bloquearHiloDeCanal(hiloId: string, bloqueado: boolean): Promise<void> {
  const { error } = await supabase.rpc('bloquear_hilo_foro', {
    p_hilo_id: hiloId,
    p_bloqueado: bloqueado,
  })
  if (error) throw error
}

export function suscribirseAHilosDeCanal(canalId: string, onCambio: () => void) {
  const channel = supabase
    .channel(`hilos-canal-${canalId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'canales_servidor',
        filter: `hilo_padre_id=eq.${canalId}`,
      },
      () => onCambio()
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes' }, () => onCambio())
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

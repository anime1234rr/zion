import { supabase } from '@/lib/supabase'
import type { ChatUser } from '@/lib/types'

export type AuditLogAction =
  | 'rol_creado'
  | 'rol_actualizado'
  | 'rol_eliminado'
  | 'canal_creado'
  | 'canal_actualizado'
  | 'canal_eliminado'
  | 'miembro_rol_cambiado'
  | 'miembro_silenciado'
  | 'miembro_desilenciado'
  | 'miembro_expulsado'
  | 'miembro_advertido'
  | 'baneo_creado'
  | 'baneo_actualizado'
  | 'baneo_eliminado'

export interface AuditLogEntry {
  id: string
  actor: ChatUser | null
  objetivo: ChatUser | null
  accion: AuditLogAction
  entidadTipo: string
  entidadId: string | null
  detalle: Record<string, unknown>
  creadoAt: string
}

interface RegistroAuditoriaRow {
  id: string
  actor_id: string | null
  actor_nombre_usuario: string | null
  actor_nombre_completo: string | null
  actor_avatar_url: string | null
  objetivo_nombre_usuario: string | null
  objetivo_nombre_completo: string | null
  objetivo_avatar_url: string | null
  accion: AuditLogAction
  entidad_tipo: string
  entidad_id: string | null
  detalle: Record<string, unknown>
  creado_at: string
}

function mapActor(row: RegistroAuditoriaRow): ChatUser | null {
  if (!row.actor_id) return null
  return {
    id: row.actor_id,
    name: row.actor_nombre_completo?.trim() || row.actor_nombre_usuario || 'Usuario',
    avatarUrl: row.actor_avatar_url ?? undefined,
    status: 'offline',
  }
}

function mapObjetivo(row: RegistroAuditoriaRow): ChatUser | null {
  if (!row.entidad_id || !row.objetivo_nombre_usuario) return null
  return {
    id: row.entidad_id,
    name: row.objetivo_nombre_completo?.trim() || row.objetivo_nombre_usuario,
    avatarUrl: row.objetivo_avatar_url ?? undefined,
    status: 'offline',
  }
}

export async function listarRegistroAuditoria(
  servidorId: string,
  antesDe?: string
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase.rpc('listar_registro_auditoria', {
    p_servidor_id: servidorId,
    p_limite: 50,
    p_antes_de: antesDe ?? null,
  })

  if (error) throw error
  return ((data ?? []) as RegistroAuditoriaRow[]).map((row) => ({
    id: row.id,
    actor: mapActor(row),
    objetivo: mapObjetivo(row),
    accion: row.accion,
    entidadTipo: row.entidad_tipo,
    entidadId: row.entidad_id,
    detalle: row.detalle ?? {},
    creadoAt: row.creado_at,
  }))
}

import { supabase } from '@/lib/supabase'

export interface ServerWebhook {
  id: string
  servidorId: string
  canalId: string
  nombre: string
  avatarUrl: string | null
  token: string
  creadoAt: string
  ultimoUsoAt: string | null
}

interface WebhookRow {
  id: string
  servidor_id: string
  canal_id: string
  nombre: string
  avatar_url: string | null
  token: string
  creado_at: string
  ultimo_uso_at: string | null
}

function mapWebhook(row: WebhookRow): ServerWebhook {
  return {
    id: row.id,
    servidorId: row.servidor_id,
    canalId: row.canal_id,
    nombre: row.nombre,
    avatarUrl: row.avatar_url,
    token: row.token,
    creadoAt: row.creado_at,
    ultimoUsoAt: row.ultimo_uso_at,
  }
}

export async function listarWebhooks(servidorId: string): Promise<ServerWebhook[]> {
  const { data, error } = await supabase
    .from('webhooks_servidor')
    .select('*')
    .eq('servidor_id', servidorId)
    .order('creado_at', { ascending: true })
    .returns<WebhookRow[]>()

  if (error) throw error
  return (data ?? []).map(mapWebhook)
}

export async function crearWebhook(
  servidorId: string,
  canalId: string,
  nombre: string
): Promise<ServerWebhook> {
  const { data, error } = await supabase
    .from('webhooks_servidor')
    .insert({ servidor_id: servidorId, canal_id: canalId, nombre: nombre.trim() })
    .select('*')
    .single<WebhookRow>()

  if (error) throw error
  return mapWebhook(data)
}

export async function eliminarWebhook(webhookId: string): Promise<void> {
  const { error } = await supabase.from('webhooks_servidor').delete().eq('id', webhookId)
  if (error) throw error
}

export async function actualizarPerfilWebhook(
  webhookId: string,
  nombre: string,
  avatarUrl: string | null
): Promise<void> {
  const { error } = await supabase.rpc('actualizar_perfil_webhook', {
    p_webhook_id: webhookId,
    p_nombre: nombre.trim(),
    p_avatar_url: avatarUrl,
  })
  if (error) throw error
}

import { supabase } from '@/lib/supabase'

export interface ServerWebhook {
  id: string
  servidorId: string
  canalId: string
  nombre: string
  token: string
  creadoAt: string
}

interface WebhookRow {
  id: string
  servidor_id: string
  canal_id: string
  nombre: string
  token: string
  creado_at: string
}

function mapWebhook(row: WebhookRow): ServerWebhook {
  return {
    id: row.id,
    servidorId: row.servidor_id,
    canalId: row.canal_id,
    nombre: row.nombre,
    token: row.token,
    creadoAt: row.creado_at,
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

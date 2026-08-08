const STATUS_URL = 'https://nlyarakldfwvjrasfrgp.supabase.co/functions/v1/Zion-status'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export interface SystemStatus {
  isMaintenance: boolean
}

export async function verificarEstadoSistema(): Promise<SystemStatus> {
  const response = await fetch(STATUS_URL, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })

  if (response.status === 503) {
    return { isMaintenance: true }
  }

  const data = await response.json().catch(() => null)
  return { isMaintenance: data?.isMaintenance === true }
}

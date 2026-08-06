import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { ServerExpresion } from '@/lib/expresiones'

interface ExpresionRow {
  id: string
  servidor_id: string
  nombre: string
  url: string
  tipo: string
  creado_at: string
}

function mapExpresion(row: ExpresionRow): ServerExpresion {
  return {
    id: row.id,
    servidorId: row.servidor_id,
    nombre: row.nombre,
    url: row.url,
    tipo: row.tipo === 'sticker' ? 'sticker' : 'emoji',
    creadoAt: row.creado_at,
  }
}

export function useUserExpresiones(userId: string) {
  const [expresiones, setExpresiones] = useState<ServerExpresion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    let cancelado = false

    async function cargar() {
      try {
        const { data: membresias, error: errorMembresias } = await supabase
          .from('miembros_servidor')
          .select('servidor_id')
          .eq('usuario_id', userId)
          .returns<{ servidor_id: string }[]>()
        if (errorMembresias) throw errorMembresias

        const servidorIds = (membresias ?? []).map((m) => m.servidor_id)
        let data: ExpresionRow[] = []
        if (servidorIds.length > 0) {
          const { data: expresiones, error } = await supabase
            .from('expresiones_servidor')
            .select('*')
            .in('servidor_id', servidorIds)
            .returns<ExpresionRow[]>()
          if (error) throw error
          data = expresiones ?? []
        }

        if (!cancelado) setExpresiones(data.map(mapExpresion))
      } catch {
        return
      }
    }

    cargar().finally(() => !cancelado && setLoading(false))

    const channel = supabase
      .channel(`expresiones-usuario-${userId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expresiones_servidor' },
        () => cargar()
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(channel)
    }
  }, [userId])

  return {
    loading,
    emojis: expresiones.filter((e) => e.tipo === 'emoji'),
    stickers: expresiones.filter((e) => e.tipo === 'sticker'),
  }
}

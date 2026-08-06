import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { listarExpresiones, type ServerExpresion } from '@/lib/expresiones'

export function useServerExpresiones(servidorId: string) {
  const [expresiones, setExpresiones] = useState<ServerExpresion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelado = false

    function cargar() {
      return listarExpresiones(servidorId)
        .then((data) => !cancelado && setExpresiones(data))
        .catch(() => {})
    }

    cargar().finally(() => !cancelado && setLoading(false))

    const channel = supabase
      .channel(`expresiones-servidor-${servidorId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expresiones_servidor',
          filter: `servidor_id=eq.${servidorId}`,
        },
        () => cargar()
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(channel)
    }
  }, [servidorId])

  return {
    loading,
    emojis: expresiones.filter((e) => e.tipo === 'emoji'),
    stickers: expresiones.filter((e) => e.tipo === 'sticker'),
  }
}

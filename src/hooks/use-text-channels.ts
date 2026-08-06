import { useEffect, useState } from 'react'

import { listarCanales } from '@/lib/channels'
import { getErrorMessage } from '@/lib/utils'
import type { ChannelItem } from '@/lib/types'

export function useTextChannels(servidorId: string) {
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listarCanales(servidorId)
      .then((categorias) => {
        if (cancelado) return
        const planos = categorias
          .flatMap((categoria) => categoria.channels)
          .filter((channel) => channel.type === 'text' || channel.type === 'announcement')
        setChannels(planos)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [servidorId])

  return { channels, loading, error }
}

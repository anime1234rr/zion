import { useEffect, useState } from 'react'

import { verificarEstadoSistema } from '@/lib/system-status'

const CHECK_INTERVAL_MS = 60_000

export function useSystemStatus(): { isMaintenance: boolean } {
  const [isMaintenance, setIsMaintenance] = useState(false)

  useEffect(() => {
    let cancelado = false

    function verificar() {
      verificarEstadoSistema()
        .then((estado) => {
          if (!cancelado) setIsMaintenance(estado.isMaintenance)
        })
        .catch((err) => console.error('No se pudo verificar el estado del sistema', err))
    }

    verificar()
    const interval = setInterval(verificar, CHECK_INTERVAL_MS)

    return () => {
      cancelado = true
      clearInterval(interval)
    }
  }, [])

  return { isMaintenance }
}

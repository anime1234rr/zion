import { useState } from 'react'

import { useTextChannels } from '@/hooks/use-text-channels'
import { actualizarServidor } from '@/lib/servers'
import { getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
import { ChannelSelect } from '@/components/server-settings/ChannelSelect'

interface CanalesEstructuraSectionProps {
  server: ServerItem
  canEdit: boolean
  onUpdated: (server: ServerItem) => void
}

export function CanalesEstructuraSection({ server, canEdit, onUpdated }: CanalesEstructuraSectionProps) {
  const { channels, loading, error: loadError } = useTextChannels(server.id)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleChange(campo: 'welcomeChannelId' | 'rulesChannelId', channelId: string | null) {
    setSaving(true)
    setError(null)
    try {
      const servidor = await actualizarServidor(server.id, { [campo]: channelId })
      onUpdated(servidor)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-foreground">Canales y Estructura</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Canales por defecto que usa {server.name} para dar la bienvenida y mostrar las reglas.
      </p>

      {(error || loadError) && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error ?? loadError}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        <ChannelSelect
          label="Canal de bienvenida"
          description="A qué canal se envían los mensajes automáticos cuando un usuario nuevo se une al servidor."
          channels={channels}
          loading={loading}
          value={server.welcomeChannelId}
          canEdit={canEdit && !saving}
          onChange={(channelId) => handleChange('welcomeChannelId', channelId)}
        />

        <ChannelSelect
          label="Canal de normas o directrices"
          description="Canal oficial donde los nuevos miembros deben aceptar las reglas del servidor antes de interactuar."
          channels={channels}
          loading={loading}
          value={server.rulesChannelId}
          canEdit={canEdit && !saving}
          onChange={(channelId) => handleChange('rulesChannelId', channelId)}
        />
      </div>

      {!canEdit && (
        <p className="mt-6 text-xs text-muted-foreground">
          No tenés permiso para editar la configuración de este servidor.
        </p>
      )}
    </div>
  )
}

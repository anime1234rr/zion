import { useState } from 'react'
import { Check } from 'lucide-react'

import { actualizarServidor } from '@/lib/servers'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ServerHistoryRetention, ServerItem, ServerVerificationLevel } from '@/lib/types'

interface VerificacionSectionProps {
  server: ServerItem
  canEdit: boolean
  onUpdated: (server: ServerItem) => void
}

const NIVELES: {
  value: ServerVerificationLevel
  label: string
  description: string
}[] = [
  {
    value: 'ninguno',
    label: 'Ninguno',
    description: 'Sin restricciones. Cualquier miembro puede escribir apenas se une.',
  },
  {
    value: 'bajo',
    label: 'Bajo',
    description: 'Requiere una cuenta con correo electrónico verificado.',
  },
  {
    value: 'medio',
    label: 'Medio',
    description: 'Requiere correo verificado y una cierta antigüedad de la cuenta en Zion.',
  },
  {
    value: 'alto',
    label: 'Alto',
    description: 'Requiere correo verificado y una antigüedad mayor de la cuenta en Zion.',
  },
]

const RETENCIONES: {
  value: ServerHistoryRetention
  label: string
  description: string
}[] = [
  { value: '7d', label: '7 días', description: 'Mensajes y archivos se conservan una semana.' },
  { value: '30d', label: '30 días', description: 'Mensajes y archivos se conservan un mes.' },
  { value: '90d', label: '90 días', description: 'Mensajes y archivos se conservan tres meses.' },
  { value: '1a', label: '1 año', description: 'Mensajes y archivos se conservan un año.' },
  {
    value: 'para_siempre',
    label: 'Para siempre',
    description: 'No se aplica ningún límite de retención.',
  },
]

export function VerificacionSection({ server, canEdit, onUpdated }: VerificacionSectionProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(nivel: ServerVerificationLevel) {
    if (nivel === server.verificationLevel) return
    setSaving(true)
    setError(null)
    try {
      const servidor = await actualizarServidor(server.id, { verificationLevel: nivel })
      onUpdated(servidor)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleSelectRetencion(retencion: ServerHistoryRetention) {
    if (retencion === server.historyRetention) return
    setSaving(true)
    setError(null)
    try {
      const servidor = await actualizarServidor(server.id, { historyRetention: retencion })
      onUpdated(servidor)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-foreground">Moderación</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Nivel de verificación mínimo que necesitan los miembros nuevos de {server.name} antes de
        poder chatear.
      </p>

      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {NIVELES.map((nivel) => {
          const active = server.verificationLevel === nivel.value
          return (
            <button
              key={nivel.value}
              type="button"
              disabled={!canEdit || saving}
              onClick={() => handleSelect(nivel.value)}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-border p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60',
                active && 'border-primary bg-primary/5'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border',
                  active && 'border-primary bg-primary text-primary-foreground'
                )}
              >
                {active && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{nivel.label}</span>
                <span className="block text-xs text-muted-foreground">{nivel.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-foreground uppercase">
        Retención de historial
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tiempo que se conservan los mensajes y archivos adjuntos en los canales de {server.name}.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {RETENCIONES.map((retencion) => {
          const active = server.historyRetention === retencion.value
          return (
            <button
              key={retencion.value}
              type="button"
              disabled={!canEdit || saving}
              onClick={() => handleSelectRetencion(retencion.value)}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-border p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60',
                active && 'border-primary bg-primary/5'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border',
                  active && 'border-primary bg-primary text-primary-foreground'
                )}
              >
                {active && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{retencion.label}</span>
                <span className="block text-xs text-muted-foreground">{retencion.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      {!canEdit && (
        <p className="mt-6 text-xs text-muted-foreground">
          No tenés permiso para editar la configuración de este servidor.
        </p>
      )}
    </div>
  )
}

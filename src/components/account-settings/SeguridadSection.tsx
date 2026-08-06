import { useEffect, useState } from 'react'

import {
  actualizarPreferenciaNotificacionSeguridad,
  obtenerPreferenciasNotificacionSeguridad,
  type SecurityNotificationPrefs,
} from '@/lib/profiles'
import { getErrorMessage } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

interface SeguridadSectionProps {
  userId: string
}

const OPCIONES: {
  clave: keyof SecurityNotificationPrefs
  label: string
  description: string
}[] = [
  {
    clave: 'cambioContrasena',
    label: 'Contraseña cambiada',
    description: 'Notificar a los usuarios cuando su contraseña haya cambiado.',
  },
  {
    clave: 'cambioEmail',
    label: 'Dirección de correo electrónico cambiada',
    description:
      'Notificar a los usuarios cuando su dirección de correo electrónico haya cambiado.',
  },
  {
    clave: 'metodoLoginVinculado',
    label: 'Método de inicio de sesión vinculado',
    description:
      'Notificar a los usuarios cuando un método de inicio de sesión se ha vinculado a su cuenta.',
  },
  {
    clave: 'metodoLoginEliminado',
    label: 'Se eliminó el método de inicio de sesión',
    description:
      'Notificar a los usuarios cuando se haya eliminado un método de inicio de sesión de su cuenta.',
  },
  {
    clave: 'mfaAgregado',
    label: 'Se agregó el método MFA',
    description: 'Notificar a los usuarios cuando se haya agregado un método MFA a su cuenta.',
  },
  {
    clave: 'mfaEliminado',
    label: 'Se eliminó el método MFA',
    description: 'Notificar a los usuarios cuando se haya eliminado un método MFA de su cuenta.',
  },
]

export function SeguridadSection({ userId }: SeguridadSectionProps) {
  const [prefs, setPrefs] = useState<SecurityNotificationPrefs | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<keyof SecurityNotificationPrefs | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    obtenerPreferenciasNotificacionSeguridad(userId)
      .then((data) => !cancelado && setPrefs(data))
      .catch((err) => !cancelado && setLoadError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [userId])

  async function handleToggle(clave: keyof SecurityNotificationPrefs, checked: boolean) {
    if (!prefs) return
    setError(null)
    const previous = prefs
    setPrefs({ ...prefs, [clave]: checked })
    setPendingKey(clave)
    try {
      await actualizarPreferenciaNotificacionSeguridad(userId, clave, checked)
    } catch (err) {
      setPrefs(previous)
      setError(getErrorMessage(err))
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Notificaciones de seguridad</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Elegí sobre qué eventos de seguridad de tu cuenta querés recibir una notificación.
      </p>

      {loadError && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}
      {!prefs && !loadError && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}

      {prefs && (
        <div className="mt-5 flex flex-col gap-4">
          {OPCIONES.map((opcion) => (
            <div key={opcion.clave} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{opcion.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{opcion.description}</p>
              </div>
              <Switch
                checked={prefs[opcion.clave]}
                onCheckedChange={(checked) => handleToggle(opcion.clave, checked)}
                disabled={pendingKey === opcion.clave}
                className="mt-0.5 shrink-0"
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

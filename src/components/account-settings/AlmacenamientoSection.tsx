import { useState } from 'react'
import { FolderOpen, Trash2 } from 'lucide-react'

import { clearCache, openUserDataFolder } from '@/lib/electron-bridge'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function AlmacenamientoSection() {
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClearCache() {
    setClearing(true)
    setError(null)
    setCleared(false)
    try {
      await clearCache()
      setCleared(true)
      setTimeout(() => setCleared(false), 2500)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Almacenamiento y Datos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Administrá el caché y los archivos locales que usa Zion en este dispositivo.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Borrar caché</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Limpia imágenes y datos temporales guardados por la app. No borra tus mensajes ni tu
              cuenta — solo puede hacer que las imágenes tarden un poco más en cargar la próxima
              vez.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={clearing} onClick={handleClearCache}>
            <Trash2 className="size-3.5" />
            {clearing ? 'Borrando…' : cleared ? 'Listo ✓' : 'Borrar'}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Carpeta de datos locales</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Abre la carpeta del sistema donde Zion guarda su configuración y caché.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openUserDataFolder}>
            <FolderOpen className="size-3.5" />
            Abrir carpeta
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Por ahora no mostramos cuánto espacio en disco ocupa cada cosa — solo las acciones de
        arriba están disponibles.
      </p>
    </div>
  )
}

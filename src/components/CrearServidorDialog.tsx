import { useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'

import { useAuth } from '@/hooks/use-auth'
import { crearServidor } from '@/lib/servers'
import { subirIconoServidor } from '@/lib/storage'
import { listarPlantillas, type PlantillaServidor } from '@/lib/templates'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CrearServidorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (server: ServerItem) => void
}

export function CrearServidorDialog({
  open,
  onOpenChange,
  onCreated,
}: CrearServidorDialogProps) {
  const { user } = useAuth()
  const [nombre, setNombre] = useState('')
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [plantillas, setPlantillas] = useState<PlantillaServidor[]>([])
  const [plantillaId, setPlantillaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listarPlantillas()
      .then((data) => {
        setPlantillas(data)
        setPlantillaId((prev) => prev ?? data[0]?.id ?? null)
      })
      .catch((err) => console.error('No se pudieron cargar las plantillas', err))
  }, [])

  function handlePickIcon(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setIconFile(file)
    setIconPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  function resetForm() {
    setNombre('')
    setIconFile(null)
    setIconPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim() || !user) return

    setLoading(true)
    setError(null)
    try {
      const iconoUrl = iconFile
        ? await subirIconoServidor(user.id, iconFile)
        : undefined
      const servidor = await crearServidor(
        nombre,
        iconoUrl,
        plantillaId ?? undefined
      )
      onCreated(servidor)
      resetForm()
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next)
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear servidor</DialogTitle>
            <DialogDescription>
              Elegí una plantilla: define los canales con los que arranca tu
              servidor. Los roles los creás vos después, desde
              Configuración &gt; Personas.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickIcon}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground outline-none hover:border-solid hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50'
              )}
            >
              {iconPreview ? (
                <img
                  src={iconPreview}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <ImagePlus className="size-5" />
              )}
            </button>
            <div className="flex-1">
              <Label htmlFor="nombre_servidor">Nombre del servidor</Label>
              <Input
                id="nombre_servidor"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Mi comunidad"
                autoFocus
                required
                className="mt-1.5"
              />
            </div>
          </div>

          {plantillas.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5">
              <Label>Plantilla</Label>
              <div className="flex flex-col gap-1.5">
                {plantillas.map((plantilla) => (
                  <button
                    key={plantilla.id}
                    type="button"
                    onClick={() => setPlantillaId(plantilla.id)}
                    aria-pressed={plantillaId === plantilla.id}
                    className={cn(
                      'rounded-lg border border-border px-3 py-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                      plantillaId === plantilla.id &&
                        'border-primary bg-primary/10'
                    )}
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {plantilla.nombre}
                    </span>
                    {plantilla.descripcion && (
                      <span className="block text-xs text-muted-foreground">
                        {plantilla.descripcion}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading || !nombre.trim()}>
              {loading ? 'Creando…' : 'Crear servidor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

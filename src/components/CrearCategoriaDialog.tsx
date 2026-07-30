import { useState } from 'react'

import { crearCategoria } from '@/lib/channels'
import { getErrorMessage } from '@/lib/utils'
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

interface CrearCategoriaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servidorId: string
  onCreated: () => void
}

export function CrearCategoriaDialog({
  open,
  onOpenChange,
  servidorId,
  onCreated,
}: CrearCategoriaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <CrearCategoriaForm
          key={String(open)}
          servidorId={servidorId}
          onOpenChange={onOpenChange}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  )
}

function CrearCategoriaForm({
  servidorId,
  onOpenChange,
  onCreated,
}: {
  servidorId: string
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim()) return

    setLoading(true)
    setError(null)
    try {
      await crearCategoria(servidorId, nombre)
      onCreated()
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Crear categoría</DialogTitle>
        <DialogDescription>
          Agrupá canales bajo un mismo encabezado colapsable. Podés arrastrar canales adentro después.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="nombre_categoria">Nombre de la categoría</Label>
        <Input
          id="nombre_categoria"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          placeholder="NUEVA CATEGORÍA"
          autoFocus
          required
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={loading || !nombre.trim()}>
          {loading ? 'Creando…' : 'Crear categoría'}
        </Button>
      </DialogFooter>
    </form>
  )
}

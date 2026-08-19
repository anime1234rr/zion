import { useState } from 'react'
import { Plus } from 'lucide-react'

import { actualizarCategoria, eliminarCategoria } from '@/lib/channels'
import { getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CanalPermisosEditor } from '@/components/ChannelSettingsDialog'
import { CrearCanalDialog } from '@/components/CrearCanalDialog'
import type { ChannelCategory } from '@/lib/types'

interface CategorySettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servidorId: string
  category: ChannelCategory | null
  onUpdated?: (category: ChannelCategory) => void
  onDeleted: (categoryId: string) => void
  onChannelCreated?: () => void
}

export function CategorySettingsDialog({
  open,
  onOpenChange,
  servidorId,
  category,
  onUpdated,
  onDeleted,
  onChannelCreated,
}: CategorySettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {category && (
          <CategorySettingsForm
            key={category.id}
            servidorId={servidorId}
            category={category}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
            onChannelCreated={onChannelCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CategorySettingsForm({
  servidorId,
  category,
  onOpenChange,
  onUpdated,
  onDeleted,
  onChannelCreated,
}: {
  servidorId: string
  category: ChannelCategory
  onOpenChange: (open: boolean) => void
  onUpdated?: (category: ChannelCategory) => void
  onDeleted: (categoryId: string) => void
  onChannelCreated?: () => void
}) {
  const [nombre, setNombre] = useState(category.name)
  const [descripcion, setDescripcion] = useState(category.description ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [createChannelOpen, setCreateChannelOpen] = useState(false)

  const dirty =
    nombre.trim() !== category.name || descripcion.trim() !== (category.description ?? '')

  async function handleGuardar(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim() || !dirty) return

    setLoading(true)
    setError(null)
    try {
      const actualizada = await actualizarCategoria(servidorId, category.id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
      })
      onUpdated?.({ ...category, name: actualizada.name, description: actualizada.description })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminar() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }

    setLoading(true)
    setError(null)
    try {
      await eliminarCategoria(servidorId, category)
      onDeleted(category.id)
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between gap-3 pr-10">
          <div>
            <DialogTitle>{category.name || 'Categoría'}</DialogTitle>
            <DialogDescription>
              Los canales de esta categoría heredan estos permisos salvo que los personalicen.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreateChannelOpen(true)}
          >
            <Plus className="size-3.5" />
            Crear canal acá
          </Button>
        </div>
      </DialogHeader>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleGuardar} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre_categoria_editar">Nombre de la categoría</Label>
          <Input
            id="nombre_categoria_editar"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="descripcion_categoria_editar">Descripción</Label>
          <Textarea
            id="descripcion_categoria_editar"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Un resumen breve de para qué es esta categoría (opcional)."
            rows={2}
            maxLength={280}
          />
        </div>

        <Button type="submit" disabled={loading || !nombre.trim() || !dirty} className="self-start">
          {loading ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>

      <CanalPermisosEditor servidorId={servidorId} canalId={category.id} canalTipo="categoria" />

      <CrearCanalDialog
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
        servidorId={servidorId}
        categoriaId={category.id}
        posicion={category.channels.length}
        onCreated={() => onChannelCreated?.()}
      />

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div>
          <Button
            type="button"
            variant={confirmingDelete ? 'destructive' : 'outline'}
            onClick={handleEliminar}
            disabled={loading}
          >
            {loading
              ? 'Eliminando…'
              : confirmingDelete
                ? '¿Seguro? Click de nuevo'
                : 'Eliminar categoría'}
          </Button>
          {category.channels.length > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {category.channels.length === 1
                ? 'El canal que contiene quedará sin categoría.'
                : `Los ${category.channels.length} canales que contiene quedarán sin categoría.`}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

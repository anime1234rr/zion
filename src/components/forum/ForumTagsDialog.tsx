import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import {
  actualizarEtiquetaForo,
  crearEtiquetaForo,
  eliminarEtiquetaForo,
  listarEtiquetasDeForo,
  type ForumTag,
} from '@/lib/forums'
import { getErrorMessage } from '@/lib/utils'
import { COLORES } from '@/lib/role-colors'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface ForumTagsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canalId: string
  onChanged: () => void
}

export function ForumTagsDialog({ open, onOpenChange, canalId, onChanged }: ForumTagsDialogProps) {
  const [tags, setTags] = useState<ForumTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelado = false
    listarEtiquetasDeForo(canalId)
      .then((data) => {
        if (!cancelado) setTags(data)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [open, canalId])

  async function handleCrear(event: React.FormEvent) {
    event.preventDefault()
    if (!nuevoNombre.trim()) return
    setCreando(true)
    setError(null)
    try {
      const color = COLORES[tags.length % COLORES.length]
      const creada = await crearEtiquetaForo(canalId, nuevoNombre, color)
      setTags((prev) => [...prev, creada])
      setNuevoNombre('')
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCreando(false)
    }
  }

  async function handleRenombrar(tag: ForumTag, nombre: string) {
    if (!nombre.trim() || nombre === tag.name) return
    try {
      const actualizada = await actualizarEtiquetaForo(tag.id, nombre, tag.color)
      setTags((prev) => prev.map((t) => (t.id === tag.id ? actualizada : t)))
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleColor(tag: ForumTag, color: string) {
    try {
      const actualizada = await actualizarEtiquetaForo(tag.id, tag.name, color)
      setTags((prev) => prev.map((t) => (t.id === tag.id ? actualizada : t)))
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleEliminar(tagId: string) {
    try {
      await eliminarEtiquetaForo(tagId)
      setTags((prev) => prev.filter((t) => t.id !== tagId))
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etiquetas del foro</DialogTitle>
          <DialogDescription>
            Definí las etiquetas que se pueden asignar a las publicaciones de este canal.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tags.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no hay etiquetas.</p>
            )}
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1">
                  {COLORES.slice(0, 6).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColor(tag, color)}
                      aria-label={color}
                      aria-pressed={tag.color.toLowerCase() === color.toLowerCase()}
                      className="size-4 shrink-0 rounded-full outline-none ring-offset-1 focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        backgroundColor: color,
                        boxShadow:
                          tag.color.toLowerCase() === color.toLowerCase()
                            ? '0 0 0 2px var(--ring)'
                            : undefined,
                      }}
                    />
                  ))}
                </div>
                <Input
                  defaultValue={tag.name}
                  onBlur={(event) => handleRenombrar(tag, event.target.value)}
                  className="h-8 flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleEliminar(tag.id)}
                  aria-label={`Eliminar etiqueta ${tag.name}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleCrear} className="mt-2 flex items-center gap-2 border-t border-border pt-3">
          <Input
            value={nuevoNombre}
            onChange={(event) => setNuevoNombre(event.target.value)}
            placeholder="Nueva etiqueta"
            className="h-8 flex-1"
          />
          <Button type="submit" size="sm" disabled={creando || !nuevoNombre.trim()}>
            <Plus className="size-3.5" />
            Agregar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

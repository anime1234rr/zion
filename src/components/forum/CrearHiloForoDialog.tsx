import { useState } from 'react'

import { crearHiloForo, type ForumTag } from '@/lib/forums'
import { cn, getErrorMessage } from '@/lib/utils'
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
import { Textarea } from '@/components/ui/textarea'

interface CrearHiloForoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canalForoId: string
  tags: ForumTag[]
  onCreated: (hiloId: string) => void
}

export function CrearHiloForoDialog({
  open,
  onOpenChange,
  canalForoId,
  tags,
  onCreated,
}: CrearHiloForoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <CrearHiloForoForm
          key={String(open)}
          canalForoId={canalForoId}
          tags={tags}
          onOpenChange={onOpenChange}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  )
}

function CrearHiloForoForm({
  canalForoId,
  tags,
  onOpenChange,
  onCreated,
}: {
  canalForoId: string
  tags: ForumTag[]
  onOpenChange: (open: boolean) => void
  onCreated: (hiloId: string) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!titulo.trim() || !cuerpo.trim()) return

    setLoading(true)
    setError(null)
    try {
      const hiloId = await crearHiloForo(canalForoId, titulo, cuerpo, selectedTagIds)
      onCreated(hiloId)
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
        <DialogTitle>Nueva publicación</DialogTitle>
        <DialogDescription>Creá un hilo para empezar una discusión en este foro.</DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="titulo_hilo">Título</Label>
        <Input
          id="titulo_hilo"
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          placeholder="¿De qué querés hablar?"
          autoFocus
          required
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="cuerpo_hilo">Mensaje</Label>
        <Textarea
          id="cuerpo_hilo"
          value={cuerpo}
          onChange={(event) => setCuerpo(event.target.value)}
          placeholder="Escribí el contenido de tu publicación…"
          rows={5}
          required
        />
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          <Label>Etiquetas</Label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                aria-pressed={selectedTagIds.includes(tag.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  selectedTagIds.includes(tag.id)
                    ? 'border-transparent text-white'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
                style={
                  selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : undefined
                }
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={loading || !titulo.trim() || !cuerpo.trim()}>
          {loading ? 'Publicando…' : 'Publicar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

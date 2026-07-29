import { useState } from 'react'
import { Code2, Hash, Megaphone, Volume2 } from 'lucide-react'

import { crearCanal } from '@/lib/channels'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChannelType } from '@/lib/types'
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

const tipos: { type: ChannelType; label: string; icon: typeof Hash }[] = [
  { type: 'text', label: 'Texto', icon: Hash },
  { type: 'voice', label: 'Voz', icon: Volume2 },
  { type: 'code', label: 'Código', icon: Code2 },
  { type: 'announcement', label: 'Anuncios', icon: Megaphone },
]

interface CrearCanalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servidorId: string
  onCreated: () => void
}

export function CrearCanalDialog({
  open,
  onOpenChange,
  servidorId,
  onCreated,
}: CrearCanalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <CrearCanalForm
          key={String(open)}
          servidorId={servidorId}
          onOpenChange={onOpenChange}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  )
}

function CrearCanalForm({
  servidorId,
  onOpenChange,
  onCreated,
}: {
  servidorId: string
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<ChannelType>('text')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim()) return

    setLoading(true)
    setError(null)
    try {
      await crearCanal(servidorId, nombre, tipo)
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
        <DialogTitle>Crear canal</DialogTitle>
        <DialogDescription>
          Solo propietarios y administradores pueden crear canales.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label>Tipo de canal</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {tipos.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => setTipo(type)}
              aria-pressed={tipo === type}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border border-border py-2 text-xs text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                tipo === type &&
                  'border-primary bg-primary/10 text-primary'
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="nombre_canal">Nombre del canal</Label>
        <Input
          id="nombre_canal"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          placeholder="nuevo-canal"
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
          {loading ? 'Creando…' : 'Crear canal'}
        </Button>
      </DialogFooter>
    </form>
  )
}

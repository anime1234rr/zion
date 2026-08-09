import { useState } from 'react'

import { crearHiloDeCanal } from '@/lib/threads'
import { getErrorMessage } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CreateThreadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: string
  originMessage: ChatMessage | null
  onCreated: (threadId: string, nombre: string) => void
}

function sugerirNombre(message: ChatMessage | null): string {
  if (!message) return ''
  const base = message.content?.trim() || (message.code ? 'Código' : 'Adjunto')
  return base.length > 50 ? `${base.slice(0, 50)}…` : base
}

export function CreateThreadDialog({
  open,
  onOpenChange,
  channelId,
  originMessage,
  onCreated,
}: CreateThreadDialogProps) {
  const [nombre, setNombre] = useState(() => sugerirNombre(originMessage))
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim()) return

    setCreating(true)
    setError(null)
    try {
      const hiloId = await crearHiloDeCanal(channelId, nombre, originMessage?.id)
      onCreated(hiloId, nombre.trim())
      setNombre('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setNombre(sugerirNombre(originMessage))
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Crear hilo</DialogTitle>
            <DialogDescription>
              Abrí una conversación aparte {originMessage ? 'a partir de este mensaje' : 'en este canal'}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hilo_nombre">Nombre del hilo</Label>
            <Input
              id="hilo_nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Charla sobre..."
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={creating || !nombre.trim()}>
            {creating ? 'Creando…' : 'Crear hilo'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

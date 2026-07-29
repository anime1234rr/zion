import { useState } from 'react'

import { unirseAServidor } from '@/lib/servers'
import { getErrorMessage } from '@/lib/utils'
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

interface UnirseServidorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJoined: (server: ServerItem) => void
}

export function UnirseServidorDialog({
  open,
  onOpenChange,
  onJoined,
}: UnirseServidorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <UnirseForm
          key={String(open)}
          onOpenChange={onOpenChange}
          onJoined={onJoined}
        />
      </DialogContent>
    </Dialog>
  )
}

function UnirseForm({
  onOpenChange,
  onJoined,
}: {
  onOpenChange: (open: boolean) => void
  onJoined: (server: ServerItem) => void
}) {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!codigo.trim()) return

    setLoading(true)
    setError(null)
    try {
      const servidor = await unirseAServidor(codigo)
      onJoined(servidor)
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
        <DialogTitle>Unirme a un servidor</DialogTitle>
        <DialogDescription>
          Pegá el código de invitación que te compartieron.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="codigo_invitacion">Código de invitación</Label>
        <Input
          id="codigo_invitacion"
          value={codigo}
          onChange={(event) => setCodigo(event.target.value)}
          placeholder="08e52c09e4ca"
          autoFocus
          required
          className="font-mono"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={loading || !codigo.trim()}>
          {loading ? 'Uniéndome…' : 'Unirme'}
        </Button>
      </DialogFooter>
    </form>
  )
}

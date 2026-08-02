import { useState } from 'react'

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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface BanMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  onConfirm: (razon: string) => Promise<void>
}

export function BanMemberDialog({ open, onOpenChange, memberName, onConfirm }: BanMemberDialogProps) {
  const [razon, setRazon] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm(razon)
      onOpenChange(false)
      setRazon('')
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
        if (loading) return
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Banear a {memberName}</DialogTitle>
          <DialogDescription>
            {memberName} va a dejar de ser miembro y no va a poder volver a unirse con ningún enlace de
            invitación hasta que lo desbanees.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="razon_baneo">Motivo (opcional)</Label>
          <Textarea
            id="razon_baneo"
            value={razon}
            onChange={(event) => setRazon(event.target.value)}
            rows={2}
            placeholder="Solo lo van a ver los moderadores del servidor"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="destructive" disabled={loading} onClick={handleConfirm}>
            {loading ? 'Baneando…' : 'Banear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

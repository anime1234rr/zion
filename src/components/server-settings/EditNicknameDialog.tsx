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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditNicknameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  currentNickname: string
  onConfirm: (apodo: string) => Promise<void>
}

export function EditNicknameDialog({
  open,
  onOpenChange,
  memberName,
  currentNickname,
  onConfirm,
}: EditNicknameDialogProps) {
  const [apodo, setApodo] = useState(currentNickname)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm(apodo)
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
        if (loading) return
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar apodo de {memberName}</DialogTitle>
          <DialogDescription>
            Solo se va a ver en este servidor. Dejalo vacío para usar el nombre de perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apodo_miembro">Apodo</Label>
          <Input
            id="apodo_miembro"
            value={apodo}
            onChange={(event) => setApodo(event.target.value)}
            maxLength={32}
            placeholder={memberName}
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" disabled={loading} onClick={handleConfirm}>
            {loading ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

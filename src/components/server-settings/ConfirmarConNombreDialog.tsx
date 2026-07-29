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

interface ConfirmarConNombreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  expectedValue: string
  confirmLabel: string
  onConfirm: () => Promise<void>
}

export function ConfirmarConNombreDialog({
  open,
  onOpenChange,
  title,
  description,
  expectedValue,
  confirmLabel,
  onConfirm,
}: ConfirmarConNombreDialogProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = input === expectedValue

  async function handleConfirm() {
    if (!matches) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      setInput('')
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
        if (!next) setInput('')
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmar_nombre">
            Escribí <span className="font-semibold text-foreground">{expectedValue}</span> para confirmar
          </Label>
          <Input
            id="confirmar_nombre"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            autoFocus
            autoComplete="off"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={!matches || loading}
            onClick={handleConfirm}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

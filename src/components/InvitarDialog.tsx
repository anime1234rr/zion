import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface InvitarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverName: string
  inviteCode?: string
}

export function InvitarDialog({
  open,
  onOpenChange,
  serverName,
  inviteCode,
}: InvitarDialogProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar a {serverName}</DialogTitle>
          <DialogDescription>
            Compartí este código. Cualquiera puede usarlo para unirse desde
            "Unirme a un servidor".
          </DialogDescription>
        </DialogHeader>

        {inviteCode ? (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2">
            <code className="flex-1 truncate font-mono text-sm">
              {inviteCode}
            </code>
            <Button type="button" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Este servidor todavía no tiene código de invitación.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

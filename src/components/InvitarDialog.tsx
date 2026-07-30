import { useState } from 'react'
import { Check, Copy, Link as LinkIcon } from 'lucide-react'

import { buildInviteLink } from '@/lib/deep-links'
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
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  async function handleCopyLink() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(buildInviteLink(inviteCode))
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1500)
  }

  async function handleCopyCode() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Invitar a {serverName}</DialogTitle>
          <DialogDescription>
            Compartí este enlace. Con un clic, quien lo abra se une directamente.
          </DialogDescription>
        </DialogHeader>

        {inviteCode ? (
          <div className="mt-2 flex flex-col gap-3 w-full overflow-hidden">
            <div className="flex w-full items-center justify-between gap-2 overflow-hidden rounded-lg border border-input bg-muted/40 p-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-1">
                <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
                <code className="min-w-0 truncate font-mono text-xs sm:text-sm text-foreground">
                  {buildInviteLink(inviteCode)}
                </code>
              </div>
              <Button type="button" size="sm" onClick={handleCopyLink} className="shrink-0">
                {copiedLink ? <Check className="size-4" /> : <Copy className="size-4" />}
                <span className="ml-1.5 hidden sm:inline">{copiedLink ? 'Copiado' : 'Copiar enlace'}</span>
                <span className="ml-1.5 sm:hidden">{copiedLink ? 'Cop.' : 'Copiar'}</span>
              </Button>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline truncate max-w-full"
            >
              {copiedCode ? 'Código copiado ✓' : `o copiá solo el código: ${inviteCode}`}
            </button>
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
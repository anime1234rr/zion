import { useEffect, useState } from 'react'

import { previsualizarInvitacion, unirseAServidor, type InvitePreview } from '@/lib/servers'
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

interface InvitePreviewDialogProps {
  open: boolean
  code: string | null
  onOpenChange: (open: boolean) => void
  onJoined: (server: ServerItem) => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export function InvitePreviewDialog({
  open,
  code,
  onOpenChange,
  onJoined,
}: InvitePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {code && (
          <InvitePreviewBody
            key={code}
            code={code}
            onOpenChange={onOpenChange}
            onJoined={onJoined}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function InvitePreviewBody({
  code,
  onOpenChange,
  onJoined,
}: {
  code: string
  onOpenChange: (open: boolean) => void
  onJoined: (server: ServerItem) => void
}) {
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    previsualizarInvitacion(code)
      .then((data) => {
        if (cancelado) return
        setPreview(data)
        if (!data) setError('Este enlace de invitación no es válido.')
      })
      .catch((err) => {
        if (cancelado) return
        setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelado) setLoadingPreview(false)
      })

    return () => {
      cancelado = true
    }
  }, [code])

  async function handleJoin() {
    setJoining(true)
    setError(null)
    try {
      const servidor = await unirseAServidor(code)
      onJoined(servidor)
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setJoining(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invitación a un servidor</DialogTitle>
        <DialogDescription>
          {loadingPreview
            ? 'Buscando el servidor…'
            : preview
              ? preview.alreadyMember
                ? 'Ya sos miembro de este servidor.'
                : 'Te invitaron a unirte a este servidor.'
              : 'No se pudo resolver esta invitación.'}
        </DialogDescription>
      </DialogHeader>

      {preview && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-input bg-muted/40 px-3 py-3">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-sm font-semibold text-secondary-foreground">
            {preview.iconUrl ? (
              <img src={preview.iconUrl} alt="" className="size-full object-cover" />
            ) : (
              getInitials(preview.name)
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{preview.name}</p>
            <p className="text-xs text-muted-foreground">
              {preview.memberCount} {preview.memberCount === 1 ? 'miembro' : 'miembros'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" onClick={handleJoin} disabled={loadingPreview || !preview || joining}>
          {joining ? 'Uniéndome…' : preview?.alreadyMember ? 'Ir al servidor' : 'Unirme'}
        </Button>
      </DialogFooter>
    </>
  )
}

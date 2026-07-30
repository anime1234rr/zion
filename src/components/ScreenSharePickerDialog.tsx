import { useEffect, useState } from 'react'
import { MonitorUp } from 'lucide-react'

import { listScreenSources } from '@/lib/electron-bridge'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ScreenSourcePayload } from '@/lib/electron-bridge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ScreenSharePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (sourceId: string, includeAudio: boolean) => void
}

export function ScreenSharePickerDialog({
  open,
  onOpenChange,
  onConfirm,
}: ScreenSharePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <ScreenSharePickerBody
            onOpenChange={onOpenChange}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ScreenSharePickerBody({
  onOpenChange,
  onConfirm,
}: {
  onOpenChange: (open: boolean) => void
  onConfirm: (sourceId: string, includeAudio: boolean) => void
}) {
  const [sources, setSources] = useState<ScreenSourcePayload[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [includeAudio, setIncludeAudio] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listScreenSources()
      .then((data) => {
        if (cancelado) return
        setSources(data)
        setSelectedId((prev) => prev ?? data[0]?.id ?? null)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [])

  function handleConfirm() {
    if (!selectedId) return
    onConfirm(selectedId, includeAudio)
    onOpenChange(false)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Compartir pantalla</DialogTitle>
        <DialogDescription>Elegí qué pantalla o ventana querés compartir.</DialogDescription>
      </DialogHeader>

      {loading && <p className="text-sm text-muted-foreground">Buscando pantallas y ventanas…</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {sources.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">
              No se encontró ninguna pantalla o ventana disponible.
            </p>
          )}
          {sources.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => setSelectedId(source.id)}
              aria-pressed={selectedId === source.id}
              className={cn(
                'flex flex-col gap-1.5 rounded-lg border border-border p-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                selectedId === source.id && 'border-primary bg-primary/10'
              )}
            >
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted">
                {source.thumbnailDataUrl ? (
                  <img src={source.thumbnailDataUrl} alt="" className="size-full object-cover" />
                ) : (
                  <MonitorUp className="size-6 text-muted-foreground" />
                )}
              </div>
              <span className="truncate text-xs text-foreground">{source.name}</span>
            </button>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={includeAudio}
          onChange={(event) => setIncludeAudio(event.target.checked)}
          className="size-4 rounded border-input accent-primary"
        />
        Compartir también el audio del sistema
      </label>

      <DialogFooter>
        <Button type="button" disabled={!selectedId} onClick={handleConfirm}>
          Compartir
        </Button>
      </DialogFooter>
    </>
  )
}

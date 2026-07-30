import { Download, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'

import { useAppUpdate } from '@/hooks/use-app-update'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

function formatVelocidad(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024) return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
  if (bytesPerSecond >= 1024) return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`
  return `${bytesPerSecond.toFixed(0)} B/s`
}

export function UpdateBadge() {
  const { status, info, progress, error, download, install } = useAppUpdate()

  if (status === 'idle') return null

  const percent = Math.round(progress?.percent ?? 0)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Actualización disponible"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-border bg-popover px-3 py-2 text-xs font-medium text-foreground shadow-lg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {status === 'error' ? (
            <TriangleAlert className="size-4 text-destructive" />
          ) : (
            <Sparkles className="size-4 text-primary" />
          )}
          <span>Actualización disponible</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Zion {info ? `v${info.version}` : ''}
          </DialogTitle>
          <DialogDescription>
            {info?.releaseDate
              ? `Publicada el ${new Date(info.releaseDate).toLocaleDateString('es-AR')}`
              : 'Hay una nueva versión disponible.'}
          </DialogDescription>
        </DialogHeader>

        {info?.releaseNotes && (
          <ScrollArea className="max-h-64 rounded-md border border-border bg-muted/30 p-3">
            <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">
              {info.releaseNotes}
            </pre>
          </ScrollArea>
        )}

        {status === 'downloading' && (
          <div className="flex flex-col gap-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {percent}%{progress ? ` · ${formatVelocidad(progress.bytesPerSecond)}` : ''}
            </span>
          </div>
        )}

        {status === 'error' && error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          {status === 'available' && (
            <Button onClick={download} className="gap-2">
              <Download className="size-4" />
              Actualizar ahora
            </Button>
          )}

          {status === 'downloading' && (
            <Button disabled className="gap-2">
              <Download className="size-4" />
              Descargando… {percent}%
            </Button>
          )}

          {status === 'downloaded' && (
            <Button onClick={install} className="gap-2">
              <RefreshCw className="size-4" />
              Reiniciar y aplicar
            </Button>
          )}

          {status === 'error' && (
            <Button variant="outline" onClick={download} className="gap-2">
              <RefreshCw className="size-4" />
              Reintentar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

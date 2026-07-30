import { Download, Loader2, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'
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
  const { status, info, progress, error, everShown, download, install, retryCheck } = useAppUpdate()

  if (status === 'idle') return null
  if (status === 'checking' && !everShown) return null

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
          ) : status === 'checking' ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Sparkles className="size-4 text-primary" />
          )}
          <span>{status === 'checking' ? 'Comprobando actualizaciones…' : 'Actualización disponible'}</span>
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
            <div
              className={cn(
                'text-xs text-muted-foreground',
                '[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:first:mt-0',
                '[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:first:mt-0',
                '[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:first:mt-0',
                '[&_p]:mb-2 [&_p]:last:mb-0',
                '[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4',
                '[&_li]:mb-0.5',
                '[&_strong]:font-semibold [&_strong]:text-foreground',
                '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-foreground',
                '[&_a]:text-primary [&_a]:underline'
              )}
              dangerouslySetInnerHTML={{ __html: info.releaseNotes }}
            />
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

        {status === 'checking' && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Comprobando actualizaciones…
          </p>
        )}

        {status === 'error' && error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          {status === 'checking' && (
            <Button disabled className="gap-2">
              <Loader2 className="size-4 animate-spin" />
              Comprobando…
            </Button>
          )}

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
            <Button variant="outline" onClick={retryCheck} className="gap-2">
              <RefreshCw className="size-4" />
              Reintentar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

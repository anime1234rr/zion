import { useState } from 'react'
import { Download, Loader2, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'

import { useAppUpdate } from '@/hooks/use-app-update'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

function formatVelocidad(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024) return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
  if (bytesPerSecond >= 1024) return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`
  return `${bytesPerSecond.toFixed(0)} B/s`
}

export function UpdateBadge() {
  const { status, info, progress, error, download, install } = useAppUpdate()
  const [open, setOpen] = useState(false)

  if (status === 'idle') return null

  const icon =
    status === 'downloading' ? (
      <Loader2 className="size-4 animate-spin" />
    ) : status === 'downloaded' ? (
      <RefreshCw className="size-4" />
    ) : status === 'error' ? (
      <TriangleAlert className="size-4" />
    ) : (
      <Sparkles className="size-4" />
    )

  const label =
    status === 'downloading'
      ? 'Descargando actualización…'
      : status === 'downloaded'
        ? 'Actualización lista para instalar'
        : status === 'error'
          ? 'Error al actualizar'
          : 'Actualización disponible'

  const percent = Math.round(progress?.percent ?? 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-border bg-popover px-3 py-2 text-xs font-medium text-foreground shadow-lg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {icon}
          <span>{label}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent side="top" align="start" className="w-80 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Zion {info ? `v${info.version}` : ''}
            </span>
            {info?.releaseDate && (
              <span className="text-xs text-muted-foreground">
                {new Date(info.releaseDate).toLocaleDateString('es-AR')}
              </span>
            )}
          </div>

          {info?.releaseNotes && (
            <ScrollArea className="max-h-48 rounded-md border border-border bg-muted/30 p-2">
              <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                {info.releaseNotes}
              </pre>
            </ScrollArea>
          )}

          {status === 'downloading' && (
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
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

          {status === 'available' && (
            <Button size="sm" onClick={download} className="gap-2">
              <Download className="size-4" />
              Descargar actualización
            </Button>
          )}

          {status === 'downloaded' && (
            <Button size="sm" onClick={install} className="gap-2">
              <RefreshCw className="size-4" />
              Reiniciar y aplicar
            </Button>
          )}

          {status === 'error' && (
            <Button size="sm" variant="outline" onClick={download} className="gap-2">
              <RefreshCw className="size-4" />
              Reintentar
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

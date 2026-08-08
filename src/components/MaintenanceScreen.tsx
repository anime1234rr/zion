import { ExternalLink, Wrench } from 'lucide-react'

import { openExternal } from '@/lib/electron-bridge'

const STATUS_URL = 'https://zion.betteruptime.com/'

export function MaintenanceScreen() {
  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative flex w-full max-w-sm animate-in fade-in-0 zoom-in-95 flex-col items-center gap-4 rounded-2xl border border-border bg-card/90 p-8 text-center text-card-foreground shadow-2xl shadow-primary/10 backdrop-blur-sm duration-300">
        <div className="relative flex size-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
            <Wrench className="size-7" />
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="mx-auto flex items-center gap-1.5 rounded-full bg-idle/10 px-2.5 py-1 text-xs font-medium text-idle">
            <span className="size-1.5 rounded-full bg-idle" />
            En mantenimiento
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Zion está en mantenimiento</h1>
          <p className="text-sm text-muted-foreground">
            Estamos realizando tareas de mantenimiento en el servicio. Volvé a intentarlo en unos
            minutos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openExternal(STATUS_URL)}
          className="mt-1 flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary/30 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Ver estado del servicio
          <ExternalLink className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

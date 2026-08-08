import { Activity, AlertTriangle, Bug, ExternalLink, FolderGit2, Wrench, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { openExternal } from '@/lib/electron-bridge'

const REPO_URL = 'https://github.com/anime1234rr/zion'
const STATUS_URL = 'https://zion.betteruptime.com/'

interface EnlaceItem {
  icon: LucideIcon
  label: string
  description: string
  url: string
  accent: string
}

const ESTADO: EnlaceItem[] = [
  {
    icon: Activity,
    label: 'Estado del servicio',
    description: 'Disponibilidad en vivo de Zion.',
    url: STATUS_URL,
    accent: 'bg-online/10 text-online',
  },
  {
    icon: Wrench,
    label: 'Mantenimientos programados',
    description: 'Ventanas de mantenimiento planificadas.',
    url: `${STATUS_URL}maintenance`,
    accent: 'bg-idle/10 text-idle',
  },
  {
    icon: AlertTriangle,
    label: 'Historial de incidentes',
    description: 'Interrupciones e incidentes pasados del servicio.',
    url: `${STATUS_URL}incidents`,
    accent: 'bg-dnd/10 text-dnd',
  },
]

const COMUNIDAD: EnlaceItem[] = [
  {
    icon: FolderGit2,
    label: 'Repositorio y documentación',
    description: 'Código fuente, README y guías del proyecto.',
    url: REPO_URL,
    accent: 'bg-primary/10 text-primary',
  },
  {
    icon: Bug,
    label: 'Reportar un error',
    description: 'Abrí un issue en GitHub describiendo el problema.',
    url: `${REPO_URL}/issues/new`,
    accent: 'bg-primary/10 text-primary',
  },
]

function EnlaceRow({ enlace }: { enlace: EnlaceItem }) {
  return (
    <button
      type="button"
      onClick={() => openExternal(enlace.url)}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3.5 text-left outline-none transition-all hover:border-primary/30 hover:bg-muted/50 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', enlace.accent)}>
        <enlace.icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{enlace.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{enlace.description}</p>
      </div>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

export function AyudaSection() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Ayuda y Soporte</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ¿Tenés dudas o encontraste un problema? Estos son los canales disponibles hoy.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <div>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Estado del servicio
          </h2>
          <div className="flex flex-col gap-2">
            {ESTADO.map((enlace) => (
              <EnlaceRow key={enlace.url} enlace={enlace} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Comunidad y desarrollo
          </h2>
          <div className="flex flex-col gap-2">
            {COMUNIDAD.map((enlace) => (
              <EnlaceRow key={enlace.url} enlace={enlace} />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Todavía no tenemos una página de preguntas frecuentes dedicada — el repositorio de GitHub
        es el mejor lugar para buscar información o dejar una consulta.
      </p>
    </div>
  )
}

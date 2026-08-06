import { Bug, ExternalLink, FolderGit2 } from 'lucide-react'

import { openExternal } from '@/lib/electron-bridge'

const REPO_URL = 'https://github.com/anime1234rr/zion'

const ENLACES = [
  {
    icon: FolderGit2,
    label: 'Repositorio y documentación',
    description: 'Código fuente, README y guías del proyecto.',
    url: REPO_URL,
  },
  {
    icon: Bug,
    label: 'Reportar un error',
    description: 'Abrí un issue en GitHub describiendo el problema.',
    url: `${REPO_URL}/issues/new`,
  },
]

export function AyudaSection() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Ayuda y Soporte</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ¿Tenés dudas o encontraste un problema? Estos son los canales disponibles hoy.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {ENLACES.map((enlace) => (
          <button
            key={enlace.url}
            type="button"
            onClick={() => openExternal(enlace.url)}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <enlace.icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{enlace.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{enlace.description}</p>
            </div>
            <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Todavía no tenemos una página de preguntas frecuentes dedicada — el repositorio de GitHub
        es el mejor lugar para buscar información o dejar una consulta.
      </p>
    </div>
  )
}

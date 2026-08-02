import { useEffect, useState } from 'react'
import { Code2, Hash, Megaphone, Volume2 } from 'lucide-react'

import {
  listarPlantillasConDetalle,
  type PlantillaCanalPreview,
  type PlantillaServidorDetalle,
} from '@/lib/templates'
import { getErrorMessage } from '@/lib/utils'

const tipoIcon: Record<string, typeof Hash> = {
  texto: Hash,
  voz: Volume2,
  codigo: Code2,
  anuncios: Megaphone,
}

const SIN_CATEGORIA = '__sin_categoria__'

function agruparCanalesPorCategoria(canales: PlantillaCanalPreview[]) {
  const grupos: { categoria: string | null; canales: PlantillaCanalPreview[] }[] = []
  const indicePorCategoria = new Map<string, number>()

  for (const canal of canales) {
    const clave = canal.categoria?.trim() || SIN_CATEGORIA
    let indice = indicePorCategoria.get(clave)
    if (indice === undefined) {
      indice = grupos.length
      indicePorCategoria.set(clave, indice)
      grupos.push({ categoria: clave === SIN_CATEGORIA ? null : clave, canales: [] })
    }
    grupos[indice].canales.push(canal)
  }

  return grupos
}

interface PlantillaSectionProps {
  serverName: string
}

export function PlantillaSection({ serverName }: PlantillaSectionProps) {
  const [plantillas, setPlantillas] = useState<PlantillaServidorDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listarPlantillasConDetalle()
      .then((data) => !cancelado && setPlantillas(data))
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Plantilla</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Los canales de {serverName} salieron de una de estas plantillas. Los
        roles que se muestran acá son sugerencias de la plantilla, no se
        crean solos — armalos vos mismo desde Personas &gt; Roles. Volver a
        aplicar una plantilla completa todavía no está disponible.
      </p>

      {loading && (
        <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>
      )}
      {error && (
        <p className="mt-6 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {plantillas.map((plantilla) => (
          <div
            key={plantilla.id}
            className="rounded-xl border border-border p-4"
          >
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              {plantilla.iconoDefecto && <span aria-hidden>{plantilla.iconoDefecto}</span>}
              {plantilla.nombre}
            </h2>
            {plantilla.descripcion && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {plantilla.descripcion}
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2">
              {agruparCanalesPorCategoria(plantilla.canales).map((grupo, index) => (
                <div key={grupo.categoria ?? index}>
                  {grupo.categoria && (
                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {grupo.categoria}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {grupo.canales.map((canal) => {
                      const Icon = tipoIcon[canal.tipo] ?? Hash
                      return (
                        <span
                          key={canal.nombre}
                          className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                        >
                          <Icon className="size-3" />
                          {canal.nombre}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {plantilla.roles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {plantilla.roles.map((rol) => (
                  <span
                    key={rol.nombre}
                    className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {rol.nombre}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

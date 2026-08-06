import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

const IDIOMAS = [
  { value: 'es-AR', label: 'Español', disponible: true },
  { value: 'en-US', label: 'English', disponible: false },
  { value: 'pt-BR', label: 'Português', disponible: false },
]

export function IdiomaSection() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Idioma y Región</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Elegí el idioma de la interfaz de Zion.
      </p>

      <div className="mt-6 flex flex-col gap-1.5">
        <Label>Idioma</Label>
        <div className="flex flex-col gap-1.5">
          {IDIOMAS.map((idioma) => (
            <div
              key={idioma.value}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5',
                !idioma.disponible && 'opacity-50'
              )}
            >
              <span className="text-sm text-foreground">{idioma.label}</span>
              {idioma.disponible ? (
                <span className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Check className="size-3.5" />
                  Activo
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Próximamente
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Zion todavía solo está traducido al español. El formato de fechas y horas sigue la
        configuración regional de tu dispositivo.
      </p>
    </div>
  )
}

import {
  setAccessibilitySetting,
  useAccessibilitySettings,
  type FontScale,
} from '@/hooks/use-accessibility-settings'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const OPCIONES_FUENTE: { value: FontScale; label: string }[] = [
  { value: 'sm', label: 'Pequeño' },
  { value: 'md', label: 'Normal' },
  { value: 'lg', label: 'Grande' },
  { value: 'xl', label: 'Muy grande' },
]

export function AccesibilidadSection() {
  const settings = useAccessibilitySettings()

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Accesibilidad</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ajustá el tamaño de texto y el movimiento en pantalla para que Zion se adapte mejor a vos.
      </p>

      <div className="mt-6 flex flex-col gap-1.5">
        <Label>Tamaño de fuente</Label>
        <p className="text-xs text-muted-foreground">
          Cambia el tamaño de todo el texto de la aplicación.
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {OPCIONES_FUENTE.map((opcion) => (
            <button
              key={opcion.value}
              type="button"
              onClick={() => setAccessibilitySetting('fontScale', opcion.value)}
              aria-pressed={settings.fontScale === opcion.value}
              className={cn(
                'rounded-md border border-border px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                settings.fontScale === opcion.value && 'border-primary bg-primary/5 font-medium'
              )}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-border p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Reducir animaciones</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Minimiza las transiciones y animaciones de la interfaz.
          </p>
        </div>
        <Switch
          checked={settings.reduceMotion}
          onCheckedChange={(checked) => setAccessibilitySetting('reduceMotion', checked)}
        />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Estas preferencias se guardan en este dispositivo, no en tu cuenta.
      </p>
    </div>
  )
}

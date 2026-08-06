import { AudioLines, Volume2, Waves } from 'lucide-react'

import { useAudioSettings, setAudioSetting, type AudioProcessingSettings } from '@/hooks/use-audio-settings'
import { useVoiceConnection } from '@/hooks/use-voice-connection'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'

interface AudioSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const OPTIONS: {
  key: keyof AudioProcessingSettings
  icon: typeof Waves
  label: string
  description: string
}[] = [
  {
    key: 'noiseSuppression',
    icon: Waves,
    label: 'Supresión de ruido',
    description:
      'Reduce ruido de fondo (teclado, ventilador, ambiente) usando el procesamiento nativo del navegador.',
  },
  {
    key: 'echoCancellation',
    icon: AudioLines,
    label: 'Cancelación de eco',
    description: 'Evita que tu propia voz vuelva por los parlantes de otros participantes.',
  },
  {
    key: 'autoGainControl',
    icon: Volume2,
    label: 'Control automático de ganancia',
    description: 'Ajusta el volumen de tu micrófono automáticamente para mantenerlo parejo.',
  },
]

export function AudioSettingsContent() {
  const settings = useAudioSettings()
  const { connectedChannelId } = useVoiceConnection()

  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base leading-none font-medium">Voz y video</h2>
        <p className="text-sm text-muted-foreground">
          Usa el procesamiento de audio nativo de tu navegador, para mejorar la calidad de tu
          micrófono.
          {connectedChannelId
            ? ' Estás en una llamada — los cambios se aplican al instante.'
            : ' Se van a aplicar la próxima vez que te conectes a un canal de voz.'}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-1">
        {OPTIONS.map((option) => (
          <div
            key={option.key}
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50"
          >
            <option.icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            <Switch
              checked={settings[option.key]}
              onCheckedChange={(checked) => setAudioSetting(option.key, checked)}
            />
          </div>
        ))}
      </div>
    </>
  )
}

export function AudioSettingsDialog({ open, onOpenChange }: AudioSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AudioSettingsContent />
      </DialogContent>
    </Dialog>
  )
}

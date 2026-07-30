import { X } from 'lucide-react'

import { formatDuration } from '@/lib/message-format'

interface VoiceMessageRecorderProps {
  seconds: number
  onCancel: () => void
}

export function VoiceMessageRecorder({ seconds, onCancel }: VoiceMessageRecorderProps) {
  return (
    <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-destructive" />
      </span>
      <span className="flex-1">Grabando mensaje de voz… {formatDuration(seconds)}</span>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancelar grabación"
        className="flex size-5 shrink-0 items-center justify-center rounded outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

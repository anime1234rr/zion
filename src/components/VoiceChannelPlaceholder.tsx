import { Volume2 } from 'lucide-react'

import type { ChannelItem } from '@/lib/types'

interface VoiceChannelPlaceholderProps {
  channel: ChannelItem
}

export function VoiceChannelPlaceholder({ channel }: VoiceChannelPlaceholderProps) {
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <Volume2 className="size-5 shrink-0 text-muted-foreground" />
        <h1 className="min-w-0 shrink truncate text-sm font-semibold text-foreground">
          {channel.name}
        </h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <Volume2 className="size-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          Este canal de voz todavía no está implementado.
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Por ahora podés crear y organizar canales de voz, pero conectarte a uno todavía no está disponible.
        </p>
      </div>
    </section>
  )
}

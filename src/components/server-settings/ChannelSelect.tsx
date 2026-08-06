import { ChevronDown, Hash } from 'lucide-react'

import type { ChannelItem } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'

interface ChannelSelectProps {
  label: string
  description?: string
  channels: ChannelItem[]
  loading: boolean
  value: string | undefined
  canEdit: boolean
  allowNone?: boolean
  onChange: (channelId: string | null) => void
}

export function ChannelSelect({
  label,
  description,
  channels,
  loading,
  value,
  canEdit,
  allowNone = true,
  onChange,
}: ChannelSelectProps) {
  const selected = channels.find((c) => c.id === value)

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!canEdit || loading}>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
          >
            {selected ? (
              <>
                <Hash className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{selected.name}</span>
              </>
            ) : (
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {loading ? 'Cargando…' : 'Ninguno'}
              </span>
            )}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {allowNone && (
            <DropdownMenuItem onSelect={() => onChange(null)}>
              <span className="text-muted-foreground">Ninguno</span>
            </DropdownMenuItem>
          )}
          {channels.map((channel) => (
            <DropdownMenuItem key={channel.id} onSelect={() => onChange(channel.id)}>
              <Hash className="size-4 shrink-0 text-muted-foreground" />
              {channel.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

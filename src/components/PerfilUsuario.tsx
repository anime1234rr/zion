import { useState } from 'react'
import {
  Headphones,
  HeadphoneOff,
  LogOut,
  Mic,
  MicOff,
  Settings,
  Sliders,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { openExternal } from '@/lib/electron-bridge'
import { toggleDeafen, toggleMute, useVoiceConnection } from '@/hooks/use-voice-connection'
import type { ChatUser, UserStatus } from '@/lib/types'
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfigurarPerfilDialog } from '@/components/ConfigurarPerfilDialog'
import { AudioSettingsDialog } from '@/components/AudioSettingsDialog'

const statusColor: Record<UserStatus, string> = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-muted-foreground/60',
}

const statusLabel: Record<UserStatus, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  offline: 'Desconectado',
}

const RELEASES_URL = 'https://github.com/anime1234rr/zion/releases'

interface PerfilUsuarioProps {
  user: ChatUser
  onSignOut?: () => void
  onProfileUpdated?: (user: ChatUser) => void
}

export function PerfilUsuario({
  user,
  onSignOut,
  onProfileUpdated,
}: PerfilUsuarioProps) {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false)
  const { muted, deafened } = useVoiceConnection()

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2 border-t border-sidebar-border bg-sidebar px-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setProfileDialogOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setProfileDialogOpen(true)
          }
        }}
        aria-label="Abrir configuración de perfil"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar>
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
          <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          <AvatarBadge className={statusColor[user.status]} />
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-sidebar-foreground">
            {user.name}
          </span>
          <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
            <span className="truncate">{user.statusText ?? statusLabel[user.status]}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openExternal(RELEASES_URL)
                  }}
                  className="shrink-0 rounded-sm text-muted-foreground/60 outline-none hover:text-muted-foreground hover:underline focus-visible:ring-1 focus-visible:ring-ring/50"
                >
                  · v{__APP_VERSION__}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Ver novedades en GitHub</TooltipContent>
            </Tooltip>
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => toggleMute()}
              aria-pressed={muted}
              aria-label={muted ? 'Activar micrófono' : 'Silenciar micrófono'}
              className={cn(
                'flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                muted && 'text-destructive'
              )}
            >
              {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {muted ? 'Activar micrófono' : 'Silenciar micrófono'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => toggleDeafen()}
              aria-pressed={deafened}
              aria-label={deafened ? 'Activar audio' : 'Ensordecer'}
              className={cn(
                'flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                deafened && 'text-destructive'
              )}
            >
              {deafened ? (
                <HeadphoneOff className="size-4" />
              ) : (
                <Headphones className="size-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {deafened ? 'Activar audio' : 'Ensordecer'}
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Configuración"
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Settings className="size-4" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Configuración</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" side="top" className="w-48">
            <DropdownMenuItem onSelect={() => setProfileDialogOpen(true)}>
              <Settings className="size-4" />
              Configurar perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAudioSettingsOpen(true)}>
              <Sliders className="size-4" />
              Voz y video
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfigurarPerfilDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        userId={user.id}
        onProfileUpdated={(updated) => onProfileUpdated?.(updated)}
      />

      <AudioSettingsDialog open={audioSettingsOpen} onOpenChange={setAudioSettingsOpen} />
    </div>
  )
}

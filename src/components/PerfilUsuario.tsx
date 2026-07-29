import { useState } from 'react'
import {
  Headphones,
  HeadphoneOff,
  LogOut,
  Mic,
  MicOff,
  Settings,
} from 'lucide-react'

import { cn } from '@/lib/utils'
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

interface PerfilUsuarioProps {
  user: ChatUser
  muted?: boolean
  deafened?: boolean
  onToggleMute?: () => void
  onToggleDeafen?: () => void
  onSignOut?: () => void
  onProfileUpdated?: (user: ChatUser) => void
}

export function PerfilUsuario({
  user,
  muted = false,
  deafened = false,
  onToggleMute,
  onToggleDeafen,
  onSignOut,
  onProfileUpdated,
}: PerfilUsuarioProps) {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2 border-t border-sidebar-border bg-sidebar px-2">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <span className="block truncate text-xs text-muted-foreground">
            {user.statusText ?? statusLabel[user.status]}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleMute}
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
              onClick={onToggleDeafen}
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
    </div>
  )
}

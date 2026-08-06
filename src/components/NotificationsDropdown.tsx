import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

import {
  listarNotificaciones,
  marcarNotificacionLeida,
  suscribirseANotificaciones,
  type AppNotification,
} from '@/lib/notifications'
import { getNotificationSettings } from '@/hooks/use-notification-settings'
import { playNotificationSound } from '@/lib/notification-sound'
import { cn, getErrorMessage } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NotificationDetailDialog } from '@/components/NotificationDetailDialog'

function formatRelativo(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24) return `hace ${diffHoras} h`
  const diffDias = Math.floor(diffHoras / 24)
  if (diffDias < 7) return `hace ${diffDias} d`
  return date.toLocaleDateString('es-AR')
}

interface NotificationsDropdownProps {
  userId: string
  onNavigateToServer?: (serverId: string) => void
}

export function NotificationsDropdown({ userId, onNavigateToServer }: NotificationsDropdownProps) {
  const [notificaciones, setNotificaciones] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null)

  useEffect(() => {
    let cancelado = false
    listarNotificaciones(userId)
      .then((data) => !cancelado && setNotificaciones(data))
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))

    const unsubscribe = suscribirseANotificaciones(userId, (nueva) => {
      setNotificaciones((prev) =>
        prev.some((n) => n.id === nueva.id) ? prev : [nueva, ...prev]
      )

      const settings = getNotificationSettings()
      if (settings.soundOnNotification) playNotificationSound()
      if (settings.desktopNotifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(nueva.titulo, { body: nueva.mensaje })
      }
    })

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [userId])

  const noLeidas = notificaciones.filter((n) => !n.leida).length

  async function handleMarcarLeida(notificacionId: string) {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === notificacionId ? { ...n, leida: true } : n))
    )
    try {
      await marcarNotificacionLeida(notificacionId)
    } catch (err) {
      console.error('No se pudo marcar la notificación como leída', err)
    }
  }

  async function handleMarcarTodasLeidas() {
    const previas = notificaciones
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    try {
      await marcarNotificacionLeida()
    } catch (err) {
      setNotificaciones(previas)
      console.error('No se pudieron marcar las notificaciones como leídas', err)
    }
  }

  function handleOpenNotification(n: AppNotification) {
    setDropdownOpen(false)
    setSelectedNotification(n)
    if (!n.leida) handleMarcarLeida(n.id)
  }

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Notificaciones"
              className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Bell className="size-4" />
              {noLeidas > 0 && (
                <span className="absolute top-1 right-1 flex size-2 rounded-full bg-primary" />
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Notificaciones</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold text-foreground">Notificaciones</span>
          {noLeidas > 0 && (
            <button
              type="button"
              onClick={handleMarcarTodasLeidas}
              className="text-xs text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Cargando…
            </p>
          )}
          {error && (
            <p className="px-3 py-4 text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && notificaciones.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No tenés notificaciones.
            </p>
          )}
          {!loading &&
            !error &&
            notificaciones.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpenNotification(n)}
                className={cn(
                  'flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 text-left outline-none last:border-b-0 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50',
                  !n.leida && 'bg-primary/5'
                )}
              >
                <span className="flex items-center gap-1.5">
                  {!n.leida && (
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <span className="truncate text-sm font-medium text-foreground">
                    {n.titulo}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{n.mensaje}</span>
                <span className="text-[11px] text-muted-foreground/70">
                  {formatRelativo(n.creadoAt)}
                </span>
              </button>
            ))}
        </div>
      </DropdownMenuContent>

      <NotificationDetailDialog
        notification={selectedNotification}
        onOpenChange={(open) => !open && setSelectedNotification(null)}
        onNavigateToServer={onNavigateToServer}
      />
    </DropdownMenu>
  )
}

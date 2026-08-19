import { AtSign, Bell, Mail, ServerCog, UserPlus } from 'lucide-react'

import type { AppNotification, NotificationType } from '@/lib/notifications'
import { parseZionLink, type ZionLink } from '@/lib/deep-links'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const tipoInfo: Record<NotificationType, { label: string; icon: typeof Bell }> = {
  mencion: { label: 'Mención', icon: AtSign },
  invitacion: { label: 'Invitación', icon: Mail },
  sistema: { label: 'Sistema', icon: ServerCog },
  mensaje_privado: { label: 'Mensaje directo', icon: Mail },
  solicitud_amistad: { label: 'Solicitud de amistad', icon: UserPlus },
}

function formatFechaCompleta(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface NotificationDetailDialogProps {
  notification: AppNotification | null
  onOpenChange: (open: boolean) => void
  onNavigateToServer?: (serverId: string) => void
  onNavigateToLink?: (link: ZionLink) => void
}

export function NotificationDetailDialog({
  notification,
  onOpenChange,
  onNavigateToServer,
  onNavigateToLink,
}: NotificationDetailDialogProps) {
  const info = notification ? tipoInfo[notification.tipo] : null
  const Icon = info?.icon ?? Bell
  const link = notification?.enlace ? parseZionLink(notification.enlace) : null

  return (
    <Dialog open={Boolean(notification)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {notification && (
          <>
            <DialogHeader>
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </span>
              <DialogTitle className="mt-2">{notification.titulo}</DialogTitle>
              <DialogDescription>{info?.label ?? notification.tipo}</DialogDescription>
            </DialogHeader>

            <p className="text-sm break-words whitespace-pre-wrap text-foreground/90">
              {notification.mensaje}
            </p>

            <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span>Recibida</span>
                <span className="text-foreground">{formatFechaCompleta(notification.creadoAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Estado</span>
                <span className="text-foreground">{notification.leida ? 'Leída' : 'No leída'}</span>
              </div>
            </div>

            {link && link.type !== 'invite' && onNavigateToLink ? (
              <Button
                variant="outline"
                onClick={() => {
                  onNavigateToLink(link)
                  onOpenChange(false)
                }}
              >
                {link.type === 'dm-message' ? 'Ir al mensaje' : 'Ir al mensaje en el canal'}
              </Button>
            ) : (
              notification.servidorId &&
              onNavigateToServer && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onNavigateToServer(notification.servidorId as string)
                    onOpenChange(false)
                  }}
                >
                  Ir al servidor
                </Button>
              )
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

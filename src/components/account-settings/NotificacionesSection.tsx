import {
  setNotificationSetting,
  useNotificationSettings,
} from '@/hooks/use-notification-settings'
import { playNotificationSound } from '@/lib/notification-sound'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

export function NotificacionesSection() {
  const settings = useNotificationSettings()

  async function handleToggleDesktop(checked: boolean) {
    if (checked && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    setNotificationSetting('desktopNotifications', checked)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Notificaciones</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gestioná las alertas, sonidos y avisos de la app en este dispositivo.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Sonido de notificación</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reproduce un sonido corto cuando te llega una notificación (mención, mensaje directo,
              solicitud de amistad, etc.).
            </p>
          </div>
          <Switch
            checked={settings.soundOnNotification}
            onCheckedChange={(checked) => setNotificationSetting('soundOnNotification', checked)}
          />
        </div>

        {settings.soundOnNotification && (
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={playNotificationSound}>
            Probar sonido
          </Button>
        )}

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Notificaciones de escritorio</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Muestra un aviso del sistema operativo cuando recibís una notificación, aunque Zion
              esté minimizado. Puede pedirte permiso del sistema la primera vez.
            </p>
          </div>
          <Switch
            checked={settings.desktopNotifications}
            onCheckedChange={handleToggleDesktop}
          />
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Estas preferencias se guardan en este dispositivo, no en tu cuenta — si usás Zion en otra
        computadora vas a tener que configurarlas de nuevo ahí.
      </p>
    </div>
  )
}

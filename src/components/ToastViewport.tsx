import { AtSign, Bell, Mail, ServerCog, UserPlus, X } from 'lucide-react'

import { dismissToast, useToasts, type ToastIcon } from '@/hooks/use-toasts'

const iconByType: Record<ToastIcon, typeof Bell> = {
  mencion: AtSign,
  invitacion: Mail,
  sistema: ServerCog,
  mensaje_privado: Mail,
  solicitud_amistad: UserPlus,
}

export function ToastViewport() {
  const toasts = useToasts()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = iconByType[toast.icon]
        return (
          <div
            key={toast.id}
            role="status"
            className="animate-in fade-in slide-in-from-bottom-4 pointer-events-auto flex items-start gap-2 rounded-xl border border-border bg-popover p-3 text-sm shadow-lg ring-1 ring-foreground/5 duration-200"
          >
            <button
              type="button"
              onClick={() => {
                toast.onClick?.()
                dismissToast(toast.id)
              }}
              className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">{toast.title}</span>
                {toast.description && (
                  <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {toast.description}
                  </span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 rounded-md p-1 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

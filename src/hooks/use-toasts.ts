import { useEffect, useState } from 'react'

export type ToastIcon = 'mencion' | 'invitacion' | 'sistema' | 'mensaje_privado' | 'solicitud_amistad'

export interface ToastData {
  id: string
  title: string
  description?: string
  icon: ToastIcon
  onClick?: () => void
}

type Listener = (toasts: ToastData[]) => void

let toasts: ToastData[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener(toasts)
}

export function pushToast(toast: Omit<ToastData, 'id'>, durationMs = 6000): string {
  const id = crypto.randomUUID()
  toasts = [...toasts, { ...toast, id }]
  emit()
  setTimeout(() => dismissToast(id), durationMs)
  return id
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function useToasts(): ToastData[] {
  const [state, setState] = useState(toasts)

  useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return state
}

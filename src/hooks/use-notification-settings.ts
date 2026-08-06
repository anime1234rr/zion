import { useEffect, useState } from 'react'

export interface NotificationSettings {
  soundOnNotification: boolean
  desktopNotifications: boolean
}

const STORAGE_KEY = 'zion:notification-settings'

const DEFAULTS: NotificationSettings = {
  soundOnNotification: true,
  desktopNotifications: false,
}

function readStored(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>
    return {
      soundOnNotification: parsed.soundOnNotification ?? DEFAULTS.soundOnNotification,
      desktopNotifications: parsed.desktopNotifications ?? DEFAULTS.desktopNotifications,
    }
  } catch {
    return DEFAULTS
  }
}

let settings: NotificationSettings = readStored()
const listeners = new Set<(settings: NotificationSettings) => void>()

export function getNotificationSettings(): NotificationSettings {
  return settings
}

export function setNotificationSetting(key: keyof NotificationSettings, value: boolean): void {
  settings = { ...settings, [key]: value }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  for (const listener of listeners) listener(settings)
}

export function useNotificationSettings(): NotificationSettings {
  const [snapshot, setSnapshot] = useState(settings)

  useEffect(() => {
    listeners.add(setSnapshot)
    return () => {
      listeners.delete(setSnapshot)
    }
  }, [])

  return snapshot
}

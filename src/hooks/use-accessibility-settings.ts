import { useEffect, useState } from 'react'

export type FontScale = 'sm' | 'md' | 'lg' | 'xl'

export interface AccessibilitySettings {
  fontScale: FontScale
  reduceMotion: boolean
}

const STORAGE_KEY = 'zion:accessibility-settings'
const FONT_SCALES: FontScale[] = ['sm', 'md', 'lg', 'xl']

const DEFAULTS: AccessibilitySettings = {
  fontScale: 'md',
  reduceMotion: false,
}

function readStored(): AccessibilitySettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>
    return {
      fontScale: parsed.fontScale && FONT_SCALES.includes(parsed.fontScale)
        ? parsed.fontScale
        : DEFAULTS.fontScale,
      reduceMotion: parsed.reduceMotion ?? DEFAULTS.reduceMotion,
    }
  } catch {
    return DEFAULTS
  }
}

function applyToDocument(current: AccessibilitySettings): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.fontScale = current.fontScale
  document.documentElement.dataset.reduceMotion = String(current.reduceMotion)
}

let settings: AccessibilitySettings = readStored()
applyToDocument(settings)
const listeners = new Set<(settings: AccessibilitySettings) => void>()

export function getAccessibilitySettings(): AccessibilitySettings {
  return settings
}

export function setAccessibilitySetting<K extends keyof AccessibilitySettings>(
  key: K,
  value: AccessibilitySettings[K]
): void {
  settings = { ...settings, [key]: value }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  applyToDocument(settings)
  for (const listener of listeners) listener(settings)
}

export function useAccessibilitySettings(): AccessibilitySettings {
  const [snapshot, setSnapshot] = useState(settings)

  useEffect(() => {
    listeners.add(setSnapshot)
    return () => {
      listeners.delete(setSnapshot)
    }
  }, [])

  return snapshot
}

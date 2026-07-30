import { useEffect, useState } from 'react'

export interface AudioProcessingSettings {
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

const STORAGE_KEY = 'zion:audio-processing-settings'

const DEFAULTS: AudioProcessingSettings = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

function readStored(): AudioProcessingSettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<AudioProcessingSettings>
    return {
      echoCancellation: parsed.echoCancellation ?? DEFAULTS.echoCancellation,
      noiseSuppression: parsed.noiseSuppression ?? DEFAULTS.noiseSuppression,
      autoGainControl: parsed.autoGainControl ?? DEFAULTS.autoGainControl,
    }
  } catch {
    return DEFAULTS
  }
}

let settings: AudioProcessingSettings = readStored()
const listeners = new Set<(settings: AudioProcessingSettings) => void>()

export function getAudioSettings(): AudioProcessingSettings {
  return settings
}

export function setAudioSetting(key: keyof AudioProcessingSettings, value: boolean): void {
  settings = { ...settings, [key]: value }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  for (const listener of listeners) listener(settings)
}

/** Para que use-voice-connection.ts reaplique los ajustes en vivo al track de mic activo, sin reconectar. */
export function suscribirseAAudioSettings(listener: (settings: AudioProcessingSettings) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAudioSettings(): AudioProcessingSettings {
  const [snapshot, setSnapshot] = useState(settings)

  useEffect(() => {
    listeners.add(setSnapshot)
    return () => {
      listeners.delete(setSnapshot)
    }
  }, [])

  return snapshot
}

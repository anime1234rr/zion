import { useEffect, useState } from 'react'

import {
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  onUpdateAvailable,
  onUpdateDownloaded,
  onUpdateError,
  onUpdateProgress,
  type UpdateInfoPayload,
  type UpdateProgressPayload,
} from '@/lib/electron-bridge'

export type AppUpdateStatus = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error'

export function useAppUpdate() {
  const [status, setStatus] = useState<AppUpdateStatus>('idle')
  const [info, setInfo] = useState<UpdateInfoPayload | null>(null)
  const [progress, setProgress] = useState<UpdateProgressPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkForUpdates().then((result) => {
      if (result) {
        setInfo(result)
        setStatus('available')
      }
    })

    const unsubAvailable = onUpdateAvailable((result) => {
      setInfo(result)
      setError(null)
      setStatus('available')
    })

    const unsubProgress = onUpdateProgress((value) => {
      setProgress(value)
      setStatus('downloading')
    })

    const unsubDownloaded = onUpdateDownloaded((result) => {
      setInfo(result)
      setStatus('downloaded')
    })

    const unsubError = onUpdateError((message) => {
      setError(message)
      setStatus('error')
    })

    return () => {
      unsubAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [])

  function download() {
    setError(null)
    setProgress(null)
    setStatus('downloading')
    downloadUpdate()
  }

  function install() {
    installUpdate()
  }

  return { status, info, progress, error, download, install }
}

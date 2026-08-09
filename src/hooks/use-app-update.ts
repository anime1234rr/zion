import { useEffect, useRef, useState } from 'react'

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
import { pushToast } from '@/hooks/use-toasts'

export type AppUpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'

export function useAppUpdate() {
  const [status, setStatus] = useState<AppUpdateStatus>('idle')
  const [info, setInfo] = useState<UpdateInfoPayload | null>(null)
  const [progress, setProgress] = useState<UpdateProgressPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [everShown, setEverShown] = useState(false)
  const notifiedVersionRef = useRef<string | null>(null)

  function notifyAvailable(result: UpdateInfoPayload) {
    if (notifiedVersionRef.current === result.version) return
    notifiedVersionRef.current = result.version
    pushToast({
      title: 'Actualización disponible',
      description: `Zion v${result.version} ya está lista para instalar.`,
      icon: 'sistema',
      onClick: download,
    })
  }

  function resolveCheck() {
    return checkForUpdates().then((result) => {
      if (result) {
        setInfo(result)
        setStatus('available')
        setEverShown(true)
        notifyAvailable(result)
      } else {
        setStatus((prev) => (prev === 'checking' ? 'idle' : prev))
      }
    })
  }

  function retryCheck() {
    setError(null)
    setStatus('checking')
    resolveCheck()
  }

  useEffect(() => {
    resolveCheck()

    const unsubAvailable = onUpdateAvailable((result) => {
      setInfo(result)
      setError(null)
      setStatus('available')
      setEverShown(true)
      notifyAvailable(result)
    })

    const unsubProgress = onUpdateProgress((value) => {
      setProgress(value)
      setStatus('downloading')
      setEverShown(true)
    })

    const unsubDownloaded = onUpdateDownloaded((result) => {
      setInfo(result)
      setStatus('downloaded')
      setEverShown(true)
    })

    const unsubError = onUpdateError((message) => {
      setError(message)
      setStatus('error')
      setEverShown(true)
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

  return { status, info, progress, error, everShown, download, install, retryCheck }
}

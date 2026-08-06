export interface UpdateInfoPayload {
  version: string
  releaseDate: string
  releaseNotes: string
}

export interface UpdateProgressPayload {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface ScreenSourcePayload {
  id: string
  name: string
  thumbnailDataUrl: string
}

interface ElectronAPI {
  getInitialDeepLink: () => Promise<string | null>
  onDeepLink: (callback: (url: string) => void) => () => void
  onBeforeQuit: (callback: () => void) => () => void
  readyToQuit: () => void
  reportError: (info: { message: string; stack?: string; context?: string }) => void
  openExternal: (url: string) => void
  listScreenSources: () => Promise<ScreenSourcePayload[]>
  selectScreenSource: (sourceId: string, includeAudio: boolean) => void
  checkForUpdates: () => Promise<UpdateInfoPayload | null>
  downloadUpdate: () => void
  installUpdate: () => void
  onUpdateAvailable: (callback: (info: UpdateInfoPayload) => void) => () => void
  onUpdateProgress: (callback: (progress: UpdateProgressPayload) => void) => () => void
  onUpdateDownloaded: (callback: (info: UpdateInfoPayload) => void) => () => void
  onUpdateError: (callback: (message: string) => void) => () => void
  clearCache: () => Promise<void>
  openUserDataFolder: () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export function getInitialDeepLink(): Promise<string | null> {
  return window.electronAPI?.getInitialDeepLink() ?? Promise.resolve(null)
}

export function onDeepLink(callback: (url: string) => void): () => void {
  return window.electronAPI?.onDeepLink(callback) ?? (() => {})
}

export function onBeforeQuit(callback: () => void): () => void {
  return window.electronAPI?.onBeforeQuit(callback) ?? (() => {})
}

export function readyToQuit(): void {
  window.electronAPI?.readyToQuit()
}

export function reportError(message: string, stack?: string, context?: string): void {
  console.error(context ? `[${context}]` : '[error]', message, stack)
  window.electronAPI?.reportError({ message, stack, context })
}

export function openExternal(url: string): void {
  if (window.electronAPI) {
    window.electronAPI.openExternal(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export function listScreenSources(): Promise<ScreenSourcePayload[]> {
  return window.electronAPI?.listScreenSources() ?? Promise.resolve([])
}

export function selectScreenSource(sourceId: string, includeAudio: boolean): void {
  window.electronAPI?.selectScreenSource(sourceId, includeAudio)
}

export function checkForUpdates(): Promise<UpdateInfoPayload | null> {
  return window.electronAPI?.checkForUpdates() ?? Promise.resolve(null)
}

export function downloadUpdate(): void {
  window.electronAPI?.downloadUpdate()
}

export function installUpdate(): void {
  window.electronAPI?.installUpdate()
}

export function onUpdateAvailable(callback: (info: UpdateInfoPayload) => void): () => void {
  return window.electronAPI?.onUpdateAvailable(callback) ?? (() => {})
}

export function onUpdateProgress(callback: (progress: UpdateProgressPayload) => void): () => void {
  return window.electronAPI?.onUpdateProgress(callback) ?? (() => {})
}

export function onUpdateDownloaded(callback: (info: UpdateInfoPayload) => void): () => void {
  return window.electronAPI?.onUpdateDownloaded(callback) ?? (() => {})
}

export function onUpdateError(callback: (message: string) => void): () => void {
  return window.electronAPI?.onUpdateError(callback) ?? (() => {})
}

export function clearCache(): Promise<void> {
  return window.electronAPI?.clearCache() ?? Promise.resolve()
}

export function openUserDataFolder(): void {
  window.electronAPI?.openUserDataFolder()
}

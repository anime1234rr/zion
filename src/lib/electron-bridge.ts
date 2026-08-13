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
  writeClipboard: (text: string) => Promise<void>
  isWindowFocused: () => Promise<boolean>
  showNotification: (payload: { title: string; body?: string }) => Promise<number>
  onNotificationClicked: (callback: (id: number) => void) => () => void
  setBadgeCount: (count: number, overlayIconDataUrl: string | null) => void
  onToggleMuteShortcut: (callback: () => void) => () => void
  onToggleDeafenShortcut: (callback: () => void) => () => void
  onIdle: (callback: () => void) => () => void
  onActive: (callback: () => void) => () => void
  getStartOnLogin: () => Promise<boolean>
  setStartOnLogin: (enabled: boolean) => void
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

export async function writeClipboard(text: string): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.writeClipboard(text)
    return
  }
  await navigator.clipboard.writeText(text)
}

export function isWindowFocused(): Promise<boolean> {
  return window.electronAPI?.isWindowFocused() ?? Promise.resolve(document.hasFocus())
}

export function showNativeNotification(payload: { title: string; body?: string }): Promise<number | null> {
  return window.electronAPI?.showNotification(payload) ?? Promise.resolve(null)
}

export function onNotificationClicked(callback: (id: number) => void): () => void {
  return window.electronAPI?.onNotificationClicked(callback) ?? (() => {})
}

export function setBadgeCount(count: number, overlayIconDataUrl: string | null): void {
  window.electronAPI?.setBadgeCount(count, overlayIconDataUrl)
}

export function onToggleMuteShortcut(callback: () => void): () => void {
  return window.electronAPI?.onToggleMuteShortcut(callback) ?? (() => {})
}

export function onToggleDeafenShortcut(callback: () => void): () => void {
  return window.electronAPI?.onToggleDeafenShortcut(callback) ?? (() => {})
}

export function onIdle(callback: () => void): () => void {
  return window.electronAPI?.onIdle(callback) ?? (() => {})
}

export function onActive(callback: () => void): () => void {
  return window.electronAPI?.onActive(callback) ?? (() => {})
}

export function getStartOnLogin(): Promise<boolean> {
  return window.electronAPI?.getStartOnLogin() ?? Promise.resolve(false)
}

export function setStartOnLogin(enabled: boolean): void {
  window.electronAPI?.setStartOnLogin(enabled)
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

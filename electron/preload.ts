import { contextBridge, ipcRenderer } from 'electron'

interface UpdateInfoPayload {
  version: string
  releaseDate: string
  releaseNotes: string
}

interface UpdateProgressPayload {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

interface ScreenSourcePayload {
  id: string
  name: string
  thumbnailDataUrl: string
}

contextBridge.exposeInMainWorld('electronAPI', {
  getInitialDeepLink: (): Promise<string | null> =>
    ipcRenderer.invoke('zion:get-initial-deep-link'),
  onDeepLink: (callback: (url: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, url: string) => callback(url)
    ipcRenderer.on('zion-deep-link', listener)
    return () => ipcRenderer.removeListener('zion-deep-link', listener)
  },
  onBeforeQuit: (callback: () => void): (() => void) => {
    const listener = () => callback()
    ipcRenderer.on('zion-before-quit', listener)
    return () => ipcRenderer.removeListener('zion-before-quit', listener)
  },
  readyToQuit: (): void => {
    ipcRenderer.send('zion-ready-to-quit')
  },
  reportError: (info: { message: string; stack?: string; context?: string }): void => {
    ipcRenderer.send('zion-renderer-error', info)
  },
  openExternal: (url: string): void => {
    ipcRenderer.send('zion:open-external', url)
  },
  writeClipboard: (text: string): Promise<void> => ipcRenderer.invoke('zion:write-clipboard', text),
  isWindowFocused: (): Promise<boolean> => ipcRenderer.invoke('zion:is-window-focused'),
  showNotification: (payload: { title: string; body?: string }): Promise<number> =>
    ipcRenderer.invoke('zion:show-notification', payload),
  onNotificationClicked: (callback: (id: number) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, id: number) => callback(id)
    ipcRenderer.on('zion-notification-clicked', listener)
    return () => ipcRenderer.removeListener('zion-notification-clicked', listener)
  },
  setBadgeCount: (count: number, overlayIconDataUrl: string | null): void => {
    ipcRenderer.send('zion:set-badge-count', count, overlayIconDataUrl)
  },
  onToggleMuteShortcut: (callback: () => void): (() => void) => {
    const listener = () => callback()
    ipcRenderer.on('zion-toggle-mute', listener)
    return () => ipcRenderer.removeListener('zion-toggle-mute', listener)
  },
  onToggleDeafenShortcut: (callback: () => void): (() => void) => {
    const listener = () => callback()
    ipcRenderer.on('zion-toggle-deafen', listener)
    return () => ipcRenderer.removeListener('zion-toggle-deafen', listener)
  },
  onIdle: (callback: () => void): (() => void) => {
    const listener = () => callback()
    ipcRenderer.on('zion-idle', listener)
    return () => ipcRenderer.removeListener('zion-idle', listener)
  },
  onActive: (callback: () => void): (() => void) => {
    const listener = () => callback()
    ipcRenderer.on('zion-active', listener)
    return () => ipcRenderer.removeListener('zion-active', listener)
  },
  getStartOnLogin: (): Promise<boolean> => ipcRenderer.invoke('zion:get-start-on-login'),
  setStartOnLogin: (enabled: boolean): void => {
    ipcRenderer.send('zion:set-start-on-login', enabled)
  },
  listScreenSources: (): Promise<ScreenSourcePayload[]> =>
    ipcRenderer.invoke('zion:list-screen-sources'),
  selectScreenSource: (sourceId: string, includeAudio: boolean): void => {
    ipcRenderer.send('zion:select-screen-source', sourceId, includeAudio)
  },
  checkForUpdates: (): Promise<UpdateInfoPayload | null> =>
    ipcRenderer.invoke('zion:check-for-updates'),
  downloadUpdate: (): void => {
    ipcRenderer.send('zion:download-update')
  },
  installUpdate: (): void => {
    ipcRenderer.send('zion:install-update')
  },
  onUpdateAvailable: (callback: (info: UpdateInfoPayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: UpdateInfoPayload) => callback(info)
    ipcRenderer.on('zion-update-available', listener)
    return () => ipcRenderer.removeListener('zion-update-available', listener)
  },
  onUpdateProgress: (callback: (progress: UpdateProgressPayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: UpdateProgressPayload) =>
      callback(progress)
    ipcRenderer.on('zion-update-progress', listener)
    return () => ipcRenderer.removeListener('zion-update-progress', listener)
  },
  onUpdateDownloaded: (callback: (info: UpdateInfoPayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: UpdateInfoPayload) => callback(info)
    ipcRenderer.on('zion-update-downloaded', listener)
    return () => ipcRenderer.removeListener('zion-update-downloaded', listener)
  },
  onUpdateError: (callback: (message: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message)
    ipcRenderer.on('zion-update-error', listener)
    return () => ipcRenderer.removeListener('zion-update-error', listener)
  },
  clearCache: (): Promise<void> => ipcRenderer.invoke('zion:clear-cache'),
  openUserDataFolder: (): void => {
    ipcRenderer.send('zion:open-user-data-folder')
  },
})

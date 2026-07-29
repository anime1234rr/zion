import { contextBridge, ipcRenderer } from 'electron'

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
})

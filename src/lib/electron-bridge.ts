interface ElectronAPI {
  getInitialDeepLink: () => Promise<string | null>
  onDeepLink: (callback: (url: string) => void) => () => void
  onBeforeQuit: (callback: () => void) => () => void
  readyToQuit: () => void
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

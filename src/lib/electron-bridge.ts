interface ElectronAPI {
  getInitialDeepLink: () => Promise<string | null>
  onDeepLink: (callback: (url: string) => void) => () => void
  onBeforeQuit: (callback: () => void) => () => void
  readyToQuit: () => void
  reportError: (info: { message: string; stack?: string; context?: string }) => void
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

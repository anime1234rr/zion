import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import electronUpdater from 'electron-updater'
import log from 'electron-log'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { autoUpdater } = electronUpdater
autoUpdater.logger = log
log.transports.file.level = 'info'

process.on('uncaughtException', (err) => {
  log.error('uncaughtException en el proceso principal', err)
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log.error('unhandledRejection en el proceso principal', reason)
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

const PROTOCOLO = 'zion'

const initialDeepLink =
  process.argv.find((arg) => arg.startsWith(`${PROTOCOLO}://`)) ?? null

let win: BrowserWindow | null = null

let allowClose = false

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.on('close', (event) => {
    if (allowClose || !win) return
    event.preventDefault()

    const finishClosing = () => {
      clearTimeout(timeout)
      ipcMain.removeListener('zion-ready-to-quit', finishClosing)
      allowClose = true
      win?.close()
    }

    const timeout = setTimeout(finishClosing, 3000)
    ipcMain.once('zion-ready-to-quit', finishClosing)
    win.webContents.send('zion-before-quit')
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

const menu = Menu.buildFromTemplate([
  ...(process.platform === 'darwin'
    ? [{ role: 'appMenu' as const }]
    : []),
  { role: 'editMenu' },
  { role: 'viewMenu' },
])
Menu.setApplicationMenu(menu)

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  log.warn('Otra instancia de Zion ya tiene el lock — cerrando esta sin abrir ventana.')
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
    const url = argv.find((arg) => arg.startsWith(`${PROTOCOLO}://`))
    if (url) win?.webContents.send('zion-deep-link', url)
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    win?.webContents.send('zion-deep-link', url)
  })

  ipcMain.handle('zion:get-initial-deep-link', () => initialDeepLink)

  ipcMain.on('zion-renderer-error', (_event, info: { message: string; stack?: string; context?: string }) => {
    log.error('Error en el renderer', info)
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
      win = null
    }
  })

  app.whenReady().then(() => {
    log.info('App lista, version', app.getVersion())

    if (VITE_DEV_SERVER_URL) {
      app.setAsDefaultProtocolClient(PROTOCOLO, process.execPath, [
        path.resolve(process.argv[1]),
      ])
    } else {
      app.setAsDefaultProtocolClient(PROTOCOLO)
    }

    createWindow()
    log.info('Ventana principal creada')

    win?.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      log.error('La ventana falló al cargar', { errorCode, errorDescription })
    })

    win?.webContents.on('render-process-gone', (_event, details) => {
      log.error('El proceso de renderizado terminó inesperadamente', details)
    })

    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        log.error('No se pudo verificar actualizaciones', err)
      })
    }
  })
}

autoUpdater.on('error', (err) => {
  log.error('Error en el auto-updater', err)
})

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

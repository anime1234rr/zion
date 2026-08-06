import { app, BrowserWindow, desktopCapturer, ipcMain, Menu, session, shell } from 'electron'
import electronUpdater, { type ProgressInfo, type UpdateInfo } from 'electron-updater'
import log from 'electron-log'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { autoUpdater } = electronUpdater
autoUpdater.logger = log
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true
log.transports.file.level = 'info'

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function serializarUpdateInfo(info: UpdateInfo) {
  const notas = info.releaseNotes
  const releaseNotes =
    typeof notas === 'string'
      ? decodeXmlEntities(notas)
      : Array.isArray(notas)
        ? notas.map((n) => `<h3>v${n.version}</h3>${decodeXmlEntities(n.note ?? '')}`).join('')
        : ''

  return {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes,
  }
}

app.commandLine.appendSwitch('disable-features', 'MediaFoundationVideoCapture')

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
let quitAndInstallPending = false
let pendingScreenSourceId: string | null = null
let pendingScreenAudio = false
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.once('ready-to-show', () => {
    win?.show()
  })

  win.on('close', (event) => {
    if (allowClose || !win) return

    if (quitAndInstallPending) {
      allowClose = true
      return
    }

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

  ipcMain.on('zion:open-external', (_event, url: string) => {
    if (URL.canParse(url) && new URL(url).protocol === 'https:') {
      shell.openExternal(url)
    }
  })

  ipcMain.handle('zion:check-for-updates', async () => {
    if (!app.isPackaged) return null
    try {
      const resultado = await autoUpdater.checkForUpdates()
      return resultado?.isUpdateAvailable ? serializarUpdateInfo(resultado.updateInfo) : null
    } catch (err) {
      log.error('No se pudo verificar actualizaciones', err)
      return null
    }
  })

  ipcMain.handle('zion:list-screen-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    })
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnailDataUrl: source.thumbnail.toDataURL(),
    }))
  })

  ipcMain.on('zion:select-screen-source', (_event, sourceId: string, includeAudio: boolean) => {
    pendingScreenSourceId = sourceId
    pendingScreenAudio = includeAudio
  })

  ipcMain.on('zion:download-update', () => {
    autoUpdater.downloadUpdate().catch((err) => {
      log.error('No se pudo descargar la actualización', err)
    })
  })

  ipcMain.on('zion:install-update', () => {
    quitAndInstallPending = true
    autoUpdater.quitAndInstall(true, true)
  })

  ipcMain.handle('zion:clear-cache', async () => {
    await session.defaultSession.clearCache()
    await session.defaultSession.clearStorageData({
      storages: ['cachestorage', 'serviceworkers'],
    })
  })

  ipcMain.on('zion:open-user-data-folder', () => {
    shell.openPath(app.getPath('userData')).catch((err) => {
      log.error('No se pudo abrir la carpeta de datos', err)
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
      win = null
    }
  })

  app.whenReady().then(() => {
    log.info('App lista, version', app.getVersion())

    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(permission === 'media')
    })

    session.defaultSession.setDisplayMediaRequestHandler(
      (_request, callback) => {
        if (!pendingScreenSourceId) {
          callback({})
          return
        }
        const sourceId = pendingScreenSourceId
        const withAudio = pendingScreenAudio
        pendingScreenSourceId = null
        pendingScreenAudio = false

        desktopCapturer
          .getSources({ types: ['screen', 'window'] })
          .then((sources) => {
            const source = sources.find((s) => s.id === sourceId)
            if (!source) {
              callback({})
              return
            }
            callback({
              video: source,
              audio: withAudio ? 'loopback' : undefined,
            })
          })
          .catch((err) => {
            log.error('No se pudo resolver la fuente de pantalla compartida', err)
            callback({})
          })
      },
      { useSystemPicker: false }
    )

    if (!app.isDefaultProtocolClient(PROTOCOLO)) {
      if (VITE_DEV_SERVER_URL) {
        app.setAsDefaultProtocolClient(PROTOCOLO, process.execPath, [
          path.resolve(process.argv[1]),
        ])
      } else {
        app.setAsDefaultProtocolClient(PROTOCOLO)
      }
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
      win?.once('ready-to-show', () => {
        autoUpdater.checkForUpdates().catch((err) => {
          log.error('No se pudo verificar actualizaciones', err)
        })
      })
    }
  })
}

autoUpdater.on('update-available', (info: UpdateInfo) => {
  win?.webContents.send('zion-update-available', serializarUpdateInfo(info))
})

autoUpdater.on('download-progress', (progress: ProgressInfo) => {
  win?.webContents.send('zion-update-progress', {
    percent: progress.percent,
    bytesPerSecond: progress.bytesPerSecond,
    transferred: progress.transferred,
    total: progress.total,
  })
})

autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
  win?.webContents.send('zion-update-downloaded', serializarUpdateInfo(info))
})

autoUpdater.on('error', (err) => {
  log.error('Error en el auto-updater', err)
  win?.webContents.send('zion-update-error', err.message)
})

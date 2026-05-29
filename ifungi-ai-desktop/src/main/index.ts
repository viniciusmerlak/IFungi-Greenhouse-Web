import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerIPCHandlers } from './ipc/handlers'
import { scheduler } from './services/scheduler'
import { initAutoUpdater } from './updater'
import logger from './logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
const singleInstanceLock = app.requestSingleInstanceLock()

app.commandLine.appendSwitch('log-level', '3')

if (!singleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.focus()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'IFungi AI Desktop',
    show: false
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  scheduler.setMainWindow(mainWindow)

  // Clean up on close
  mainWindow.on('closed', () => {
    scheduler.setMainWindow(null)
    mainWindow = null
  })
}

// App lifecycle
if (singleInstanceLock) {
  app.whenReady().then(() => {
    // Register IPC handlers
    registerIPCHandlers()

    // Create window
    createWindow()

    // Initialize updater and logging
    try {
      initAutoUpdater(() => mainWindow)
    } catch (err) {
      logger.error('Failed to initialize updater', err)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error)
})

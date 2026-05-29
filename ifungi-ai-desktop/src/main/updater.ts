import { app, ipcMain, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import logger from './logger'
import path from 'path'
import fsExtra from 'fs-extra'
import { IPC_CHANNELS } from '@shared/types'

const { autoUpdater } = electronUpdater
const { ensureFileSync, writeJsonSync, existsSync, readJsonSync } = fsExtra

const CHECK_INTERVAL = 6 * 60 * 60 * 1000 // 6 hours
const STATE_FILE = path.join(app.getPath('userData'), 'update-state.json')

function writeState(state: any) {
  try {
    ensureFileSync(STATE_FILE)
    writeJsonSync(STATE_FILE, state)
  } catch (err) {
    logger.warn('Failed to write update state', err)
  }
}

function readState() {
  try {
    if (existsSync(STATE_FILE)) return readJsonSync(STATE_FILE)
  } catch (err) {
    logger.warn('Failed to read update state', err)
  }
  return {}
}

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  logger.info('Initializing auto-updater')

  autoUpdater.autoDownload = true
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...')
    getMainWindow()?.webContents.send(IPC_CHANNELS.UPDATE_CHECK, { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    logger.info('Update available', info)
    getMainWindow()?.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, info)
  })

  autoUpdater.on('update-not-available', (info) => {
    logger.info('No update available', info)
    getMainWindow()?.webContents.send(IPC_CHANNELS.UPDATE_NOT_AVAILABLE, info)
  })

  autoUpdater.on('error', (err) => {
    logger.error('Update error', err)
    getMainWindow()?.webContents.send(IPC_CHANNELS.UPDATE_ERROR, err?.toString?.() || String(err))
  })

  autoUpdater.on('download-progress', (progress) => {
    logger.info('Download progress', progress)
    getMainWindow()?.webContents.send(IPC_CHANNELS.UPDATE_PROGRESS, progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update downloaded', info)
    writeState({ pending: true, version: info.version })
    getMainWindow()?.webContents.send(IPC_CHANNELS.UPDATE_DOWNLOADED, info)
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async () => {
    try {
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (err) {
      logger.warn('checkForUpdates failed', err)
      return { ok: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, async () => {
    try {
      logger.info('Install requested - quitting and installing')
      writeState({ pending: false, installing: true })
      autoUpdater.quitAndInstall(false, true)
      return { ok: true }
    } catch (err) {
      logger.error('Install failed', err)
      return { ok: false, error: String(err) }
    }
  })

  setTimeout(() => {
    try {
      autoUpdater.checkForUpdatesAndNotify()
    } catch (err) {
      logger.warn('Initial checkForUpdatesAndNotify failed', err)
    }
  }, 5000)

  setInterval(() => {
    try {
      autoUpdater.checkForUpdates()
    } catch (err) {
      logger.warn('Periodic check failed', err)
    }
  }, CHECK_INTERVAL)

  try {
    const state = readState()
    if (state?.installing) {
      writeState({})
    }
  } catch (err) {
    logger.warn('State read error', err)
  }
}

export default initAutoUpdater
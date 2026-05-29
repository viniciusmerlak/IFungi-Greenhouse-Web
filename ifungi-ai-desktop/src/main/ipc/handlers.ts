import { ipcMain, app } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import { configStore } from '../services/configStore'
import { firebaseClient } from '../services/firebaseClient'
import { captureOrchestrator } from '../services/captureOrchestrator'
import { scheduler } from '../services/scheduler'
import { ensureFirebaseSession } from '../services/authSession'
import { captureArchive } from '../services/captureArchive'

/**
 * Register all IPC handlers
 */
export function registerIPCHandlers() {
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async () => {
    try {
      return await configStore.getConfig()
    } catch (error) {
      console.error('Error getting config:', error)
      throw error
    }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, async (_event, config) => {
    try {
      await configStore.setConfig(config)
    } catch (error) {
      console.error('Error setting config:', error)
      throw error
    }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_TEST_CONNECTION, async () => {
    try {
      const config = await configStore.getConfig()

      if (!config.firebaseEmail || !config.greenhouseId) {
        return { success: false, error: 'Missing Firebase credentials or greenhouse ID' }
      }

      await ensureFirebaseSession()

      return { success: true }
    } catch (error: any) {
      console.error('Connection test failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CAPTURE_RUN, async (_event, payload) => {
    try {
      return await captureOrchestrator.runAnalysis(payload)
    } catch (error: any) {
      console.error('Capture failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CAPTURE_GET_STATUS, async () => {
    try {
      return captureOrchestrator.getStatus()
    } catch (error) {
      console.error('Error getting capture status:', error)
      throw error
    }
  })

  ipcMain.handle(IPC_CHANNELS.HISTORY_GET, async (_event, limit = 30) => {
    try {
      const config = await configStore.getConfig()
      if (!config.greenhouseId) {
        return []
      }

      await ensureFirebaseSession()

      return await firebaseClient.getAISuggestions(config.greenhouseId, limit)
    } catch (error) {
      console.error('Error getting history:', error)
      return []
    }
  })

  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_LOCAL, async (_event, limit = 30) => {
    try {
      return await captureArchive.getEntries(limit)
    } catch (error) {
      console.error('Error getting local history:', error)
      return []
    }
  })

  ipcMain.handle(IPC_CHANNELS.SCHEDULER_GET_STATUS, async () => {
    try {
      return await scheduler.getStatus()
    } catch (error) {
      console.error('Error getting scheduler status:', error)
      throw error
    }
  })

  ipcMain.handle(IPC_CHANNELS.SCHEDULER_SET_TIME, async (_event, time) => {
    try {
      await scheduler.setDailyCaptureTime(time)
    } catch (error) {
      console.error('Error setting schedule time:', error)
      throw error
    }
  })

  ipcMain.handle(IPC_CHANNELS.FIREBASE_AUTH_STATUS, async () => {
    try {
      return firebaseClient.getAuthStatus()
    } catch (error) {
      console.error('Error getting auth status:', error)
      return { authenticated: false }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FIREBASE_SIGN_IN, async (_event, email, password) => {
    try {
      await firebaseClient.signIn(email, password)
      return { success: true }
    } catch (error: any) {
      console.error('Sign in failed:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FIREBASE_SIGN_OUT, async () => {
    try {
      await firebaseClient.signOut()
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    }
  })

  ipcMain.handle('app:get-version', async () => {
    try {
      return app.getVersion()
    } catch (err) {
      console.error('Failed to get version', err)
      return '0.0.0'
    }
  })

  console.log('IPC handlers registered')
}

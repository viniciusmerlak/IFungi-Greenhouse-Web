import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/types'

// Expose protected methods in the render process
contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET),
  setConfig: (config: unknown) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET, config),
  testConnection: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_TEST_CONNECTION),

  // Capture
  runCapture: (payload: unknown) => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_RUN, payload),
  getCaptureStatus: () => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_GET_STATUS),

  // History
  getHistory: (limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET, limit),
  getLocalHistory: (limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET_LOCAL, limit),
  getLatestCarryOverNote: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET_LATEST_CARRY_OVER),

  // Scheduler
  getSchedulerStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER_GET_STATUS),
  setScheduleTime: (time: string) => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER_SET_TIME, time),
  onScheduledCapture: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on(IPC_CHANNELS.SCHEDULER_TRIGGER_CAPTURE, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SCHEDULER_TRIGGER_CAPTURE, listener)
    }
  },

  // Firebase
  getAuthStatus: () => ipcRenderer.invoke(IPC_CHANNELS.FIREBASE_AUTH_STATUS),
  signIn: (email: string, password: string) => ipcRenderer.invoke(IPC_CHANNELS.FIREBASE_SIGN_IN, email, password),
  signOut: () => ipcRenderer.invoke(IPC_CHANNELS.FIREBASE_SIGN_OUT),

  // Updater
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),
  installUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL),
  onUpdateAvailable: (cb: (info: any) => void) => {
    const listener = (_: any, info: any) => cb(info)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_AVAILABLE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_AVAILABLE, listener)
  },
  onUpdateNotAvailable: (cb: (info: any) => void) => {
    const listener = (_: any, info: any) => cb(info)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_NOT_AVAILABLE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_NOT_AVAILABLE, listener)
  },
  onUpdateDownloaded: (cb: (info: any) => void) => {
    const listener = (_: any, info: any) => cb(info)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_DOWNLOADED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_DOWNLOADED, listener)
  },
  onUpdateProgress: (cb: (progress: any) => void) => {
    const listener = (_: any, progress: any) => cb(progress)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_PROGRESS, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_PROGRESS, listener)
  },
  onUpdateError: (cb: (err: any) => void) => {
    const listener = (_: any, err: any) => cb(err)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_ERROR, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_ERROR, listener)
  },

  // Misc
  getAppVersion: () => ipcRenderer.invoke('app:get-version')
})

// Type definitions for TypeScript
export interface ElectronAPI {
  getConfig: () => Promise<any>
  setConfig: (config: any) => Promise<void>
  testConnection: () => Promise<{ success: boolean; error?: string }>
  runCapture: (payload: any) => Promise<{ success: boolean; suggestionId?: string; error?: string }>
  getCaptureStatus: () => Promise<any>
  getHistory: (limit?: number) => Promise<any[]>
  getLocalHistory: (limit?: number) => Promise<any[]>
  getLatestCarryOverNote: () => Promise<{ aiNote: string; operatorNote: string }>
  getSchedulerStatus: () => Promise<any>
  setScheduleTime: (time: string) => Promise<void>
  onScheduledCapture: (callback: () => void) => () => void
  getAuthStatus: () => Promise<{ authenticated: boolean; email?: string }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>

  // Updater
  checkForUpdates: () => Promise<any>
  installUpdate: () => Promise<any>
  onUpdateAvailable: (cb: (info: any) => void) => () => void
  onUpdateNotAvailable: (cb: (info: any) => void) => () => void
  onUpdateDownloaded: (cb: (info: any) => void) => () => void
  onUpdateProgress: (cb: (progress: any) => void) => () => void
  onUpdateError: (cb: (err: any) => void) => () => void

  // Misc
  getAppVersion: () => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

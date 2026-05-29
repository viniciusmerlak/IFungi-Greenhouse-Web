import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/types'
import { configStore } from './configStore'

const SCHEDULE_GRACE_MS = 15 * 60 * 1000

/**
 * Simple scheduler for daily capture tasks.
 */
class Scheduler {
  private checkInterval: NodeJS.Timeout | null = null
  private lastCheckDate: string | null = null
  private mainWindow: BrowserWindow | null = null
  private triggering = false

  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window

    if (window && !this.checkInterval) {
      this.startScheduler()
    }
  }

  private startScheduler() {
    this.checkInterval = setInterval(() => {
      this.checkSchedule()
    }, 60000)

    setTimeout(() => {
      this.checkSchedule()
    }, 5000)
  }

  private async checkSchedule() {
    try {
      const config = await configStore.getConfig()

      if (!config.dailyCaptureTime || config.selectedCameras.length === 0) {
        return
      }

      const now = new Date()
      const today = now.toISOString().split('T')[0]

      if (this.lastCheckDate === today) {
        return
      }

      const [hours, minutes] = config.dailyCaptureTime.split(':').map(Number)
      const scheduledTime = new Date(now)
      scheduledTime.setHours(hours, minutes, 0, 0)
      const missedWindow = now.getTime() - scheduledTime.getTime() > SCHEDULE_GRACE_MS

      if (now < scheduledTime) {
        return
      }

      if (missedWindow) {
        this.lastCheckDate = today
        return
      }

      const lastAttempt = config.lastRunAt
      const lastAttemptDate = lastAttempt ? new Date(lastAttempt).toISOString().split('T')[0] : null

      if (lastAttemptDate === today) {
        this.lastCheckDate = today
        return
      }

      const triggered = await this.triggerScheduledCapture()

      if (triggered) {
        await configStore.setConfig({ lastRunAt: Date.now() })
        this.lastCheckDate = today
      }
    } catch (error) {
      console.error('Scheduler check failed:', error)
    }
  }

  private async triggerScheduledCapture(): Promise<boolean> {
    if (this.triggering) return false
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return false

    this.triggering = true

    try {
      console.log('Scheduled capture triggered')
      this.mainWindow.webContents.send(IPC_CHANNELS.SCHEDULER_TRIGGER_CAPTURE)
      return true
    } finally {
      this.triggering = false
    }
  }

  async setDailyCaptureTime(time: string) {
    await configStore.setConfig({ dailyCaptureTime: time })
    this.lastCheckDate = null
    await this.checkSchedule()
  }

  async getStatus() {
    const config = await configStore.getConfig()
    return {
      enabled: !!config.dailyCaptureTime && config.selectedCameras.length > 0,
      scheduledTime: config.dailyCaptureTime,
      lastRunAt: config.lastSuccessfulRunAt,
      lastCheckDate: this.lastCheckDate
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
}

export const scheduler = new Scheduler()

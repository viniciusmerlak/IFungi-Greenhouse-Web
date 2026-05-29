import { app } from 'electron'
import electronLog from 'electron-log'
import path from 'path'

// Configure electron-log
electronLog.transports.file.resolvePath = () =>
  path.join(app.getPath('userData'), 'logs', 'main.log')
electronLog.transports.file.maxSize = 5 * 1024 * 1024 // 5 MB
electronLog.transports.file.level = 'info'
electronLog.transports.console.level = 'warn'

export default electronLog
import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export interface CaptureArchiveEntry {
  timestamp: number
  suggestionId?: string
  localPaths: string[]
  note?: string
  greenhouseId: string
  status: 'success' | 'error'
  error?: string
}

class CaptureArchive {
  private captureDir: string | null = null
  private indexPath: string | null = null

  private getPaths() {
    if (!this.captureDir) {
      const homeDir = app.getPath('home')
      this.captureDir = path.join(homeDir, 'IFungi', 'captures')
      this.indexPath = path.join(this.captureDir, 'archive-index.json')
    }

    return {
      captureDir: this.captureDir!,
      indexPath: this.indexPath!
    }
  }

  async ensureDir(): Promise<string> {
    const { captureDir } = this.getPaths()
    await fs.mkdir(captureDir, { recursive: true })
    return captureDir
  }

  async addEntry(entry: CaptureArchiveEntry): Promise<void> {
    const { indexPath } = this.getPaths()
    await this.ensureDir()

    const existing = await this.getEntries(500)
    const next = [entry, ...existing].slice(0, 500)

    await fs.writeFile(indexPath, JSON.stringify(next, null, 2))
  }

  async getEntries(limit = 30): Promise<CaptureArchiveEntry[]> {
    const { indexPath } = this.getPaths()

    try {
      const raw = await fs.readFile(indexPath, 'utf-8')
      const entries = JSON.parse(raw) as CaptureArchiveEntry[]
      return entries.slice(0, limit)
    } catch {
      return []
    }
  }
}

export const captureArchive = new CaptureArchive()

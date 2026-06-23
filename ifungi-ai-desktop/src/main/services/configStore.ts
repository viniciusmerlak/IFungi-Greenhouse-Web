import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { AppConfig, SecureConfig } from '@shared/types'
import { readSecureJson, writeSecureJson } from './secureStorage'

export interface PublicAppConfig extends AppConfig {
  hasGeminiApiKey: boolean
  hasFirebasePassword: boolean
}

/**
 * Configuration store with secure credential storage
 */
class ConfigStore {
  private config: AppConfig | null = null
  private secureConfig: SecureConfig | null = null

  private get configPath() {
    return path.join(app.getPath('userData'), 'config.json')
  }

  private get secureConfigPath() {
    return path.join(app.getPath('userData'), 'secure-config.dat')
  }

  /**
   * Get current configuration (without secure values)
   */
  async getConfig(): Promise<PublicAppConfig> {
    if (!this.config) {
      await this.loadConfig()
    }

    if (!this.secureConfig) {
      await this.loadSecureConfig()
    }

    const base = this.config || this.getDefaultConfig()

    return {
      ...base,
      hasGeminiApiKey: !!this.secureConfig?.geminiApiKey,
      hasFirebasePassword: !!this.secureConfig?.firebasePassword
    }
  }

  /**
   * Set configuration
   */
  async setConfig(newConfig: Partial<AppConfig & SecureConfig>): Promise<void> {
    const { firebasePassword, geminiApiKey, ...publicConfig } = newConfig as Partial<AppConfig & SecureConfig>

    this.config = {
      ...this.getDefaultConfig(),
      ...this.config,
      ...publicConfig
    }

    if (!this.secureConfig) {
      await this.loadSecureConfig()
    }

    this.secureConfig = this.secureConfig || {}

    if (firebasePassword !== undefined) {
      if (firebasePassword === '') {
        delete this.secureConfig.firebasePassword
      } else {
        this.secureConfig.firebasePassword = firebasePassword
      }
    }

    if (geminiApiKey !== undefined) {
      if (geminiApiKey === '') {
        delete this.secureConfig.geminiApiKey
      } else {
        this.secureConfig.geminiApiKey = geminiApiKey
      }
    }

    await this.saveSecureConfig()
    await this.saveConfig()
  }

  /**
   * Get a secure value (like password or API key)
   */
  async getSecureValue(key: keyof SecureConfig): Promise<string | undefined> {
    if (!this.secureConfig) {
      await this.loadSecureConfig()
    }
    return this.secureConfig?.[key]
  }

  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      this.config = JSON.parse(data)
    } catch {
      this.config = this.getDefaultConfig()
    }
  }

  private async saveConfig(): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2))
  }

  private async loadSecureConfig(): Promise<void> {
    this.secureConfig = (await readSecureJson<SecureConfig>(this.secureConfigPath)) || {}
  }

  private async saveSecureConfig(): Promise<void> {
    await writeSecureJson(this.secureConfigPath, this.secureConfig)
  }

  private getDefaultConfig(): AppConfig {
    return {
      selectedCameras: [],
      geminiAnalysisEnabled: true,
      dailyCaptureTime: '09:00',
      aiModelId: 'gemini-2.5-flash',
      includeHistoricalImages: false,
      historicalImageLimit: 4
    }
  }
}

export const configStore = new ConfigStore()

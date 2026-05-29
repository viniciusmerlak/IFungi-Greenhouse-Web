import { safeStorage } from 'electron'
import fs from 'fs/promises'

/**
 * Encrypt and persist a JSON payload when safeStorage is available.
 */
export async function writeSecureJson(filePath: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data)

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(json)
    await fs.writeFile(filePath, encrypted)
    return
  }

  console.warn('safeStorage not available, storing credentials in plain text')
  await fs.writeFile(filePath, json)
}

/**
 * Read and decrypt a JSON payload written with writeSecureJson.
 */
export async function readSecureJson<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath)

    if (safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(data)
      return JSON.parse(decrypted) as T
    }

    return JSON.parse(data.toString()) as T
  } catch {
    return null
  }
}

import { configStore } from './configStore'
import { firebaseClient } from './firebaseClient'

/**
 * Ensure the desktop app is signed in before RTDB reads/writes.
 */
export async function ensureFirebaseSession(): Promise<void> {
  const status = firebaseClient.getAuthStatus()
  if (status.authenticated) return

  const config = await configStore.getConfig()
  const password = await configStore.getSecureValue('firebasePassword')

  if (!config.firebaseEmail || !password) {
    throw new Error('Firebase credentials not configured')
  }

  await firebaseClient.signIn(config.firebaseEmail, password)
}

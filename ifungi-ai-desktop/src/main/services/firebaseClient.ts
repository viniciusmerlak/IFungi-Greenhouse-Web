import { initializeApp, FirebaseApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut, Auth, User, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, ref, get, set, query, orderByChild, limitToLast, Database } from 'firebase/database'
import { AISuggestion, GreenhouseState, SensorHistoryEntry } from '@shared/types'

function removeUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues) as unknown as T
  }

  if (value && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) {
        const cleanedItem = removeUndefinedValues(item)
        if (cleanedItem !== undefined) {
          cleaned[key] = cleanedItem
        }
      }
    }

    return cleaned as T
  }

  return value
}

/**
 * Firebase client for desktop app
 */
class FirebaseClient {
  private app: FirebaseApp | null = null
  private auth: Auth | null = null
  private db: Database | null = null
  private currentUser: User | null = null

  constructor() {
    this.initialize()
  }

  private initialize() {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCqq0lkiPq8vcua1_UXPwlslR5E8yGvjOk',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pfi-ifungi.firebaseapp.com',
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://pfi-ifungi-default-rtdb.firebaseio.com',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pfi-ifungi',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pfi-ifungi.firebasestorage.app',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '94721839071',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:94721839071:web:b36772e162aa8a2264fe6a'
    }

    this.app = initializeApp(firebaseConfig)
    this.auth = getAuth(this.app)
    this.db = getDatabase(this.app)

    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user
    })
  }

  async signIn(email: string, password: string): Promise<void> {
    if (!this.auth) throw new Error('Firebase auth not initialized')

    const userCredential = await signInWithEmailAndPassword(this.auth, email, password)
    this.currentUser = userCredential.user
  }

  async signOut(): Promise<void> {
    if (!this.auth) return

    await firebaseSignOut(this.auth)
    this.currentUser = null
  }

  getAuthStatus(): { authenticated: boolean; email?: string } {
    return {
      authenticated: !!this.currentUser,
      email: this.currentUser?.email || undefined
    }
  }

  async getGreenhouseState(greenhouseId: string): Promise<GreenhouseState> {
    if (!this.db) throw new Error('Firebase database not initialized')

    const greenhouseRef = ref(this.db, `greenhouses/${greenhouseId}`)
    const snapshot = await get(greenhouseRef)

    if (!snapshot.exists()) {
      throw new Error(`Greenhouse ${greenhouseId} not found`)
    }

    return snapshot.val()
  }

  async getSensorHistory(greenhouseId: string, limit = 288): Promise<SensorHistoryEntry[]> {
    if (!this.db) throw new Error('Firebase database not initialized')

    const historyRef = ref(this.db, `historico/${greenhouseId}`)
    let snapshot

    try {
      const historyQuery = query(historyRef, orderByChild('timestamp'), limitToLast(limit))
      snapshot = await get(historyQuery)
    } catch (error) {
      if (error instanceof Error && /Index not defined|indexOn/i.test(error.message)) {
        snapshot = await get(historyRef)
      } else {
        throw error
      }
    }

    if (!snapshot.exists()) {
      return []
    }

    const entries: SensorHistoryEntry[] = []
    snapshot.forEach((childSnapshot) => {
      const value = childSnapshot.val()
      if (value && typeof value === 'object') {
        entries.push(value)
      }
    })

    return entries
      .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0))
      .slice(-limit)
  }

  async writeAISuggestion(greenhouseId: string, suggestion: AISuggestion): Promise<string> {
    if (!this.db) throw new Error('Firebase database not initialized')

    const suggestionId = `ai_${Date.now()}`
    const suggestionRef = ref(this.db, `greenhouses/${greenhouseId}/ai_suggestions/${suggestionId}`)
    const cleanedSuggestion = removeUndefinedValues(suggestion)

    await set(suggestionRef, cleanedSuggestion)

    return suggestionId
  }

  async getAISuggestions(greenhouseId: string, limit = 30): Promise<AISuggestion[]> {
    if (!this.db) throw new Error('Firebase database not initialized')

    const suggestionsRef = ref(this.db, `greenhouses/${greenhouseId}/ai_suggestions`)
    let snapshot

    try {
      const suggestionsQuery = query(suggestionsRef, orderByChild('createdAt'), limitToLast(limit))
      snapshot = await get(suggestionsQuery)
    } catch (error) {
      if (error instanceof Error && /Index not defined|indexOn/i.test(error.message)) {
        snapshot = await get(suggestionsRef)
      } else {
        throw error
      }
    }

    if (!snapshot.exists()) {
      return []
    }

    const suggestions: AISuggestion[] = []
    snapshot.forEach((childSnapshot) => {
      suggestions.push(childSnapshot.val())
    })

    return suggestions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  }
}

export const firebaseClient = new FirebaseClient()

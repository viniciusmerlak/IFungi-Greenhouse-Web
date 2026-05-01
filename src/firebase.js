import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean)

let app = null
let auth = null
let db = null
let storage = null

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getDatabase(app)
  storage = getStorage(app)
} else {
  console.warn('Firebase config ausente. Configure o arquivo .env para habilitar login e dados.')
}

export { app, auth, db, storage, hasFirebaseConfig }

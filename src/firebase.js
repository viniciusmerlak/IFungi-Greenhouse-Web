import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

// Firebase Web SDK config. These values are public by design — they identify
// the Firebase project to the client and are visible in any production bundle.
// Real security comes from Auth + Realtime Database rules, not from hiding
// these values. `import.meta.env.*` overrides exist so a local `.env` (or a
// fork pointing to a different Firebase project) can override per-environment
// without code changes.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCqq0lkiPq8vcua1_UXPwlslR5E8yGvjOk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pfi-ifungi.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://pfi-ifungi-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pfi-ifungi',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pfi-ifungi.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '94721839071',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:94721839071:web:b36772e162aa8a2264fe6a',
}

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean)

let app = null
let auth = null
let db = null

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getDatabase(app)
} else {
  console.warn('Firebase config ausente.')
}

export { app, auth, db, hasFirebaseConfig }

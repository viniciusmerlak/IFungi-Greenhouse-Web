import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth, hasFirebaseConfig } from '../firebase'

const missingConfigMessage =
  'Firebase nao configurado. Crie um arquivo .env com as variaveis VITE_FIREBASE_* para habilitar o login.'

export const loginWithEmail = (email, password) => {
  if (!auth || !hasFirebaseConfig) {
    return Promise.reject(new Error(missingConfigMessage))
  }
  return signInWithEmailAndPassword(auth, email, password)
}

export const logout = () => {
  if (!auth || !hasFirebaseConfig) {
    return Promise.resolve()
  }
  return signOut(auth)
}

export function useAuthState() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(hasFirebaseConfig)

  useEffect(() => {
    if (!auth || !hasFirebaseConfig) {
      return undefined
    }
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return { user, loading }
}

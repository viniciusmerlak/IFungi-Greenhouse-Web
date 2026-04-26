import { onValue, ref, set, update } from 'firebase/database'
import { db } from '../firebase'

export const greenhousePath = (greenhouseId, node = '') =>
  `/greenhouses/${greenhouseId}${node ? `/${node}` : ''}`

const missingDatabaseError = new Error(
  'Firebase Realtime Database nao configurado. Verifique as variaveis VITE_FIREBASE_* no .env.',
)

export const subscribeNode = (path, callback) => {
  if (!db) return () => {}
  return onValue(ref(db, path), (snapshot) => callback(snapshot.val()))
}

export const writeNode = (path, value) => {
  if (!db) return Promise.reject(missingDatabaseError)
  return set(ref(db, path), value)
}

export const updateNode = (path, value) => {
  if (!db) return Promise.reject(missingDatabaseError)
  return update(ref(db, path), value)
}

export const subscribeAllowedGreenhouses = (uid, callback) =>
  subscribeNode(`/Usuarios/${uid}/Estufas permitidas`, callback)

export const subscribeGreenhouseNode = (greenhouseId, node, callback) =>
  subscribeNode(greenhousePath(greenhouseId, node), callback)

export const updateGreenhouseNode = (greenhouseId, node, value) =>
  updateNode(greenhousePath(greenhouseId, node), value)

export const writeGreenhouseNode = (greenhouseId, node, value) =>
  writeNode(greenhousePath(greenhouseId, node), value)

export const subscribeGreenhouseHistory = (greenhouseId, callback) =>
  subscribeNode(`/historico/${greenhouseId}`, callback)

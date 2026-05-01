/**
 * @file storage.js
 * @brief Helpers para uso do Firebase Storage como buffer temporario do .bin
 *        antes do GitHub Actions publicar a release.
 */
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../firebase'

function sanitizeId(id) {
  return String(id || 'unknown').replace(/[^A-Za-z0-9_-]+/g, '_')
}

export function buildStagingPath(greenhouseId, version) {
  const ts = Date.now()
  const safeId = sanitizeId(greenhouseId)
  const safeVersion = String(version || '0.0.0').replace(/[^0-9.]/g, '')
  return `ota-staging/${safeId}/${ts}-v${safeVersion}.bin`
}

export async function uploadStagingBin(path, file, onProgress) {
  if (!storage) throw new Error('Firebase Storage nao inicializado')
  const ref = storageRef(storage, path)
  const task = uploadBytesResumable(ref, file, { contentType: 'application/octet-stream' })
  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes && onProgress) {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          onProgress(Math.round(pct))
        }
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          resolve(url)
        } catch (err) {
          reject(err)
        }
      },
    )
  })
}

export async function deleteStagingBin(path) {
  if (!storage) return
  try {
    await deleteObject(storageRef(storage, path))
  } catch (err) {
    console.warn('Falha ao limpar staging:', err?.message || err)
  }
}
